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
  Map<String, Map<String, String>> queryToDataRow =
      ImmutableMap.of(
          "live",
          ImmutableMap.of(
              "under-18",
              "DP05_0019E",
              "over-18",
              "DP05_0021E",
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
              "S0201_119E,S0201_126E",
              "male",
              "S0701_C01_012E,S0701_C04_012E",
              "female",
              "S0701_C01_013E,S0701_C04_013E"));

  Map<String, String> tableNameToAbbrev =
      ImmutableMap.of("profile", "DP", "spp", "SPP", "subject", "ST");

  // Depending on the beginning of the data table string, the query URL changes slightly
  private String getDataTableString(String tablePrefix) {
    if (tablePrefix.substring(0, 1).equals("D")) {
      return "profile?get=NAME,";
    } else if (tablePrefix.substring(0, 5).equals("S0201")) {
      return "spp?get=NAME,"; // Special case - different from the other S tables
    } else if (tablePrefix.substring(0, 1).equals("S")) {
      return "subject?get=NAME,";
    }
    return ""; // should never reach this point
  }

  private String getcensusTableLink(String fetchUrlString, String dataTablePrefix, String year) {
    return "https://data.census.gov/cedsci/table?tid=ACS"
        + tableNameToAbbrev.get(
            fetchUrlString.substring(
                fetchUrlString.indexOf(dataTablePrefix), fetchUrlString.indexOf("?")))
        + "1Y"
        + year
        + "."
        + fetchUrlString.substring(fetchUrlString.indexOf(",") + 1, fetchUrlString.indexOf("_"));
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String personType = request.getParameter("person-type");
    String action = request.getParameter("action");
    String location = request.getParameter("location");
    String year = request.getParameter("year");

    if (!queryToDataRow.containsKey(action)) {
      // We don't have information on this action
      response.sendError(
          HttpServletResponse.SC_NOT_IMPLEMENTED, "We do not support this visualization yet.");
      return;
    } else if (!queryToDataRow.get(action).containsKey(personType)) {
      // This action doesn't make sense with this type of person,
      // or the census doesn't keep data on it that we could find
      response.sendError(
          HttpServletResponse.SC_BAD_REQUEST,
          "This query is not supported by census data. Try asking a more general one.");
      return;
    }

    String dataRow = queryToDataRow.get(action).get(personType);
    String dataTablePrefix = getDataTableString(dataRow);
    if (dataTablePrefix.equals("")) {
      response.sendError(
          HttpServletResponse.SC_NOT_IMPLEMENTED, "We do not support this visualization yet.");
    }

    URL fetchUrl =
        new URL(
            "https://api.census.gov/data/"
                + year
                + "/acs/acs1/"
                + dataTablePrefix
                + dataRow
                + "&for="
                + (location.equals("state") ? "state:*" : "county:*&in=state:" + location)
                + "&key=ea65020114ffc1e71e760341a0285f99e73eabbc");

    String censusTableLink = getcensusTableLink(fetchUrl.toString(), dataTablePrefix, year);

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
        response.sendError(
            HttpServletResponse.SC_BAD_REQUEST,
            "This query is not supported by census data. Try asking a more general one.");
      }
      JsonObject jsonResponse = new JsonObject();
      Gson gson = new Gson();
      jsonResponse.addProperty("data", data);
      jsonResponse.addProperty("tableLink", censusTableLink);
      response.setContentType("application/json;");
      response.getWriter().println(jsonResponse.toString());
    }
  }
}
