import static com.googlecode.objectify.ObjectifyService.ofy;

import com.google.common.collect.ImmutableMap;
import com.google.gson.JsonObject;
import com.google.sps.data.CensusData;
import com.google.sps.data.DataFormatter;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.InvalidObjectException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** Servlet that handles census queries from users */
@WebServlet("/query")
public class QueryServlet extends HttpServlet {

  // Hardcoded initial choices for which lines of which data table are accessed
  Map<String, Map<String, String>> queryToDataRowGeneric =
      ImmutableMap.of(
          "live",
          ImmutableMap.of(
              "under-18",
              "DP05_0001E,DP05_0018E",
              "over-18",
              "DP05_0018E",
              "all-ages",
              "DP05_0001E",
              "male",
              "DP05_0002E",
              "female",
              "DP05_0003E"),
          "work",
          ImmutableMap.of(
              "all-ages",
              "DP03_0004E",
              "over-18",
              "DP03_0004E",
              "male",
              "S0201_182E",
              "female",
              "DP03_0013E"),
          "moved",
          ImmutableMap.of(
              "all-ages",
              "S0201_125E,S0201_126E,S0201_119E",
              "male",
              "S0701_C04_012E,S0701_C05_012E,S0701_C01_012E",
              "female",
              "S0701_C04_013E,S0701_C05_013E,S0701_C01_013E"));

  // After 2013, some queries have more data available
  Map<String, Map<String, String>> queryToDataRowPost2013 =
      ImmutableMap.of(
          "live",
          ImmutableMap.of(
              "under-18",
              "K200102_001E",
              "over-18",
              "K200104_001E,K200102_001E",
              "all-ages",
              "K200104_001E",
              "male",
              "K200101_002E",
              "female",
              "K200101_003E"),
          "work",
          ImmutableMap.of("all-ages", "K202301_004E", "over-18", "K202301_004E"),
          "moved",
          ImmutableMap.of("all-ages", "K200701_005E,K200701_006E"));

  // Even more data available for population in 2010 when the decennial census happened
  Map<String, Map<String, String>> queryToDataRowDecennial =
      ImmutableMap.of(
          "live",
          ImmutableMap.of(
              "all-ages",
              "P001001",
              "male",
              "P012002",
              "female",
              "P012026",
              "under-18",
              "P014001,P014021,P014022,P014042,P014043",
              "over-18",
              "P010001"));

  Map<String, String> tableNameToAbbrev =
      ImmutableMap.of("profile", "DP", "spp", "SPP", "subject", "ST");

  // Depending on the beginning of the data table string, the query URL changes slightly
  private String getDataTableString(String tablePrefix) throws NoSuchFieldException {
    String firstChar = tablePrefix.substring(0, 1);
    if (firstChar.equals("K")) {
      return "/acs/acsse";
    } else if (firstChar.equals("D")) {
      return "/acs/acs1/profile";
    } else if (tablePrefix.length() >= 5 && tablePrefix.substring(0, 5).equals("S0201")) {
      return "/acs/acs1/spp"; // Special case - different from the other S tables
    } else if (firstChar.equals("S")) {
      return "/acs/acs1/subject";
    } else if (firstChar.equals("P")) {
      return "/dec/sf1";
    }
    // Should never reach this point
    throw new NoSuchFieldException("This string doesn't correspond to any data table.");
  }

  // Link to the human-readable version of the same data table
  private String getCensusTableLink(String dataRow, String dataTablePrefix, String year) {
    if (dataRow.substring(0, 1).equals("P")) {
      // Decennial queries have overly specific tables, so always return a general one instead
      return "https://data.census.gov/cedsci/table?tid=DECENNIALSF12010.P12";
    }
    return "https://data.census.gov/cedsci/table?tid=ACS"
        + (dataRow.substring(0, 1).equals("K")
            ? "SE"
            : (tableNameToAbbrev.get(
                    dataTablePrefix.substring(dataTablePrefix.lastIndexOf("/") + 1))
                + "1Y"))
        + year
        + "."
        + dataRow.substring(0, (dataRow.contains("_") ? dataRow.indexOf("_") : dataRow.length()));
  }

  private String sendError(String errorMessage) {
    JsonObject jsonResponse = new JsonObject();
    jsonResponse.addProperty("errorMessage", errorMessage);
    return jsonResponse.toString();
  }

  private String getLocation(boolean stateTotal, boolean singleCounty,
      String location, String county) {
    if (stateTotal) {
      return "state:" + location;
    } else if (singleCounty) {
      return "county:" + county + "&in=state:" + location;
    } else if (location.equals("state")) {
      return "state:*";
    } else {
      return "county:*&in=state:" + location;
    }
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String personType = request.getParameter("person-type");
    String action = request.getParameter("action");
    String location = request.getParameter("location");
    String yearStr = request.getParameter("year");
    int year = Integer.parseInt(yearStr);
    String stateTotalString = request.getParameter("state-total");
    String county = request.getParameter("county");
    boolean stateTotal = false;
    boolean singleCounty = false;
    if (stateTotalString != null) {
      stateTotal = stateTotalString.equals("true");
    }
    if (county != null) {
      singleCounty = true;
    }

    response.setContentType("application/json;");
    String query = null;
    if (!stateTotal && !singleCounty) {
      query = personType + action + location + yearStr;
      CensusData cachedData = ofy().load().type(CensusData.class).id(query).now();
      if (cachedData != null) {
        JsonObject jsonResponse = new JsonObject();
        jsonResponse.addProperty("censusData", cachedData.getData());
        jsonResponse.addProperty("tableLink", cachedData.getTableLink());
        response.getWriter().println(jsonResponse.toString());
        return;
      }
    }

    if (!queryToDataRowGeneric.containsKey(action)) {
      // We don't have information on this action
      response.setStatus(HttpServletResponse.SC_NOT_IMPLEMENTED);
      response.getWriter().println(sendError("We do not support this visualization yet."));
      return;
    } else if (!queryToDataRowGeneric.get(action).containsKey(personType)) {
      // This action doesn't make sense with this type of person,
      // or the census doesn't keep data on it that we could find
      response.setStatus(HttpServletResponse.SC_NOT_IMPLEMENTED);
      response
          .getWriter()
          .println(
              sendError(
                  "This query is not supported by census data. Try asking a more general one."));
      return;
    }

    String dataRow = queryToDataRowGeneric.get(action).get(personType);
    if (year > 2013
        && queryToDataRowPost2013.containsKey(action)
        && queryToDataRowPost2013.get(action).containsKey(personType)) {
      dataRow = queryToDataRowPost2013.get(action).get(personType);
    }
    if (year == 2010
        && queryToDataRowDecennial.containsKey(action)
        && queryToDataRowDecennial.get(action).containsKey(personType)) {
      dataRow = queryToDataRowDecennial.get(action).get(personType);
    }

    // Queries about moving to counties instead of states need additional data
    if (!location.equals("state") && action.equals("moved")) {
      if (personType.equals("all-ages") && year > 2013) {
        dataRow = "K200701_004E," + dataRow;
      } else if (personType.equals("all-ages")) {
        dataRow = "S0201_124E," + dataRow;
      } else if (personType.equals("male")) {
        dataRow = "S0701_C03_012E," + dataRow;
      } else if (personType.equals("female")) {
        dataRow = "S0701_C03_013E," + dataRow;
      }
    }

    String dataTablePrefix;
    try {
      dataTablePrefix = getDataTableString(dataRow);
    } catch (NoSuchFieldException e) {
      response.setStatus(HttpServletResponse.SC_NOT_IMPLEMENTED);
      response.getWriter().println(sendError("We do not support this visualization yet."));
      return;
    }

    URL fetchUrl =
        new URL(
            "https://api.census.gov/data/"
                + year
                + dataTablePrefix
                + "?get=NAME,"
                + dataRow
                + "&for="
                + getLocation(stateTotal, singleCounty, location, county)
                + "&key=ea65020114ffc1e71e760341a0285f99e73eabbc");
    String censusTableLink = getCensusTableLink(dataRow, dataTablePrefix, yearStr);

    HttpURLConnection connection = (HttpURLConnection) fetchUrl.openConnection();
    connection.setRequestMethod("GET");

    if (connection.getResponseCode() > 299) {
      // An error occurred
      response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
      response
          .getWriter()
          .println(sendError("An error occurred while trying to retrieve census data."));
    } else {
      String data = "";
      BufferedReader reader =
          new BufferedReader(new InputStreamReader(connection.getInputStream()));
      String responseLine = reader.readLine();

      while (responseLine != null) {
        data += responseLine;
        responseLine = reader.readLine();
      }
      reader.close();
      if (data.isEmpty()) {
        response.setStatus(HttpServletResponse.SC_NOT_IMPLEMENTED);
        response
            .getWriter()
            .println(
                sendError(
                    "This query is not supported by census data. Try asking a more general one."));
        return;
      }

      String formattedData;
      try {
        formattedData = DataFormatter.reformatDataArray(data, dataRow, !location.equals("state"));
      } catch (InvalidObjectException e) {
        response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
        response
            .getWriter()
            .println(sendError("An error occurred while trying to retrieve census data."));
        return;
      }

      if (!stateTotal && !singleCounty) {
        if (query != null) {
          // Save this response to cache
          ofy().save().entity(new CensusData(query, formattedData, censusTableLink)).now();
        }
      }
      response.setStatus(HttpServletResponse.SC_OK);
      JsonObject jsonResponse = new JsonObject();
      jsonResponse.addProperty("censusData", formattedData);
      jsonResponse.addProperty("tableLink", censusTableLink);
      response.getWriter().println(jsonResponse.toString());
    }
  }
}
