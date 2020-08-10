import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
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
              "DP05_0019E",
              "over-18",
              "DP05_0021E", /* TODO: could be added to post2013 using subtraction */
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
          "moved", /* TODO: All of these really should be two to three columns added together,
                   and then calculated as a percentage */
          ImmutableMap.of(
              "all-ages",
              "S0201_119E,S0201_126E",
              "male",
              "S0701_C01_012E,S0701_C04_012E",
              "female",
              "S0701_C01_013E,S0701_C04_013E"));

  // After 2013, some queries have more data available
  Map<String, Map<String, String>> queryToDataRowPost2013 =
      ImmutableMap.of(
          "live",
          ImmutableMap.of(
              "under-18",
              "K200102_001E",
              "all-ages",
              "K200104_001E",
              "male",
              "K200101_002E",
              "female",
              "K200101_003E"),
          "work",
          ImmutableMap.of("all-ages", "K202301_004E", "over-18", "K202301_004E"),
          "moved",
          /* TODO: K200701_005E + K200701_006E for state query,
          but actually have to add K200701_004E as well for county query */
          ImmutableMap.of("all-ages", "S0201_119E,S0201_126E"));

  Map<String, String> tableNameToAbbrev =
      ImmutableMap.of("profile", "DP", "spp", "SPP", "subject", "ST");

  // Depending on the beginning of the data table string, the query URL changes slightly
  private String getDataTableString(String tablePrefix) throws NoSuchFieldException {
    String firstChar = tablePrefix.substring(0, 1);
    if (firstChar.equals("K")) {
      return "";
    } else if (firstChar.equals("D")) {
      return "/profile";
    } else if (tablePrefix.length() >= 5 && tablePrefix.substring(0, 5).equals("S0201")) {
      return "/spp"; // Special case - different from the other S tables
    } else if (firstChar.equals("S")) {
      return "/subject";
    }
    // should never reach this point
    throw new NoSuchFieldException("This string doesn't correspond to any data table.");
  }

  private String getCensusTableLink(String dataRow, String dataTablePrefix, String year) {
    return "https://data.census.gov/cedsci/table?tid=ACS"
        + (dataRow.substring(0, 1).equals("K")
            ? "SE"
            : (tableNameToAbbrev.get(dataTablePrefix.substring(1)) + "1Y"))
        + year
        + "."
        + dataRow.substring(
            0, (dataRow.contains("_") ? dataRow.indexOf("_") : dataRow.length() + 1));
  }

  private String sendError(String errorMessage) {
      JsonObject jsonResponse = new JsonObject();
      jsonResponse.addProperty("errorMessage", errorMessage);
      return jsonResponse.toString();
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String personType = request.getParameter("person-type");
    String action = request.getParameter("action");
    String location = request.getParameter("location");
    String yearStr = request.getParameter("year");
    int year = Integer.parseInt(yearStr);

    if (!queryToDataRowGeneric.containsKey(action)) {
      // We don't have information on this action
      response.setStatus(HttpServletResponse.SC_NOT_IMPLEMENTED);
      response.setContentType("application/json;");
      response.getWriter().println(sendError("We do not support this visualization yet."));
      return;
    } else if (!queryToDataRowGeneric.get(action).containsKey(personType)) {
      // This action doesn't make sense with this type of person,
      // or the census doesn't keep data on it that we could find
      response.setStatus(HttpServletResponse.SC_NOT_IMPLEMENTED);
      response.setContentType("application/json;");
      response.getWriter().println(sendError(
          "This query is not supported by census data. Try asking a more general one."));
      return;
    }
    
    String dataRow = queryToDataRowGeneric.get(action).get(personType);
    if (year > 2013
        && queryToDataRowPost2013.containsKey(action)
        && queryToDataRowPost2013.get(action).containsKey(personType)) {
      dataRow = queryToDataRowPost2013.get(action).get(personType);
    }

    String dataTablePrefix;
    try {
      dataTablePrefix = getDataTableString(dataRow);
    } catch (NoSuchFieldException e) {
      response.setStatus(HttpServletResponse.SC_NOT_IMPLEMENTED);
      response.setContentType("application/json;");
      response.getWriter().println(sendError("We do not support this visualization yet."));
      return;
    }

    URL fetchUrl =
        new URL(
            "https://api.census.gov/data/"
                + year
                + "/acs/"
                + (dataRow.substring(0, 1).equals("K") ? "acsse" : "acs1")
                + dataTablePrefix
                + "?get=NAME,"
                + dataRow
                + "&for="
                + (location.equals("state") ? "state:*" : "county:*&in=state:" + location)
                + "&key=ea65020114ffc1e71e760341a0285f99e73eabbc");

    String censusTableLink = getCensusTableLink(dataRow, dataTablePrefix, yearStr);

    HttpURLConnection connection = (HttpURLConnection) fetchUrl.openConnection();
    connection.setRequestMethod("GET");

    if (connection.getResponseCode() > 299) {
      // An error occurred
      response.sendError(
          HttpServletResponse.SC_BAD_GATEWAY,
          "An error occurred while trying to retrieve census data.");
    } else {
      response.setStatus(HttpServletResponse.SC_OK);
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
        response.setContentType("application/json;");
        response.getWriter().println(sendError(
            "This query is not supported by census data. Try asking a more general one."));
        return;
      }
      JsonObject jsonResponse = new JsonObject();
      Gson gson = new Gson();
      jsonResponse.addProperty("censusData", data);
      jsonResponse.addProperty("tableLink", censusTableLink);
      response.setContentType("application/json;");
      response.getWriter().println(jsonResponse.toString());
    }
  }
}
