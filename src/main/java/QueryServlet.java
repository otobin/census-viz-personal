import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.InvalidObjectException;
import java.lang.reflect.Type;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
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
      response.setContentType("application/json;");
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
                + (location.equals("state") ? "state:*" : "county:*&in=state:" + location)
                + "&key=ea65020114ffc1e71e760341a0285f99e73eabbc");

    String censusTableLink = getCensusTableLink(dataRow, dataTablePrefix, yearStr);

    HttpURLConnection connection = (HttpURLConnection) fetchUrl.openConnection();
    connection.setRequestMethod("GET");

    if (connection.getResponseCode() > 299) {
      // An error occurred
      response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
      response.setContentType("application/json;");
      response
          .getWriter()
          .println(sendError("An error occurred while trying to retrieve census data."));
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
        response
            .getWriter()
            .println(
                sendError(
                    "This query is not supported by census data. Try asking a more general one."));
        return;
      }

      String formattedData;
      try {
        formattedData = reformatDataArray(data, dataRow, !location.equals("state"));
      } catch (InvalidObjectException e) {
        response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
        response.setContentType("application/json;");
        response
            .getWriter()
            .println(sendError("An error occurred while trying to retrieve census data."));
        return;
      }

      JsonObject jsonResponse = new JsonObject();
      jsonResponse.addProperty("censusData", formattedData);
      jsonResponse.addProperty("tableLink", censusTableLink);
      response.setContentType("application/json;");
      response.getWriter().println(jsonResponse.toString());
    }
  }

  // Some data arrays need reformatting (columns added together, etc.) before they can be
  // visualized.

  // Generic functions to combine numbers. Note that Math.round returns a long,
  // but we can cast to int (max value ~2 billion) because our numbers
  // will always be smaller than the U.S. population (~330 million)
  BiFunction<Float, Float, Integer> add = (Float a, Float b) -> (int) Math.round(a + b);
  BiFunction<Float, Float, Integer> rightSubtract = (Float a, Float b) -> (int) Math.round(a - b);
  BiFunction<Float, Float, Integer> percent =
      (Float a, Float b) -> (int) Math.round((a / 100.0) * b);

  // Mapping data columns to the functions we want to execute on them --
  // for example, if we are not able to access the population of children,
  // instead we can do rightSubtract(total population, adult population)
  Map<String, List<BiFunction>> dataRowToReformatFunction =
      ImmutableMap.<String, List<BiFunction>>builder()
          .put("DP05_0001E,DP05_0018E", ImmutableList.of(rightSubtract))
          .put("S0201_119E,S0201_126E", ImmutableList.of(percent))
          .put("K200104_001E,K200102_001E", ImmutableList.of(rightSubtract))
          .put("S0701_C04_012E,S0701_C05_012E,S0701_C01_012E", ImmutableList.of(add, percent))
          .put("S0701_C04_013E,S0701_C05_013E,S0701_C01_013E", ImmutableList.of(add, percent))
          .put("S0201_125E,S0201_126E,S0201_119E", ImmutableList.of(add, percent))
          .put("K200701_005E,K200701_006E", ImmutableList.of(add))
          .put("K200701_004E,K200701_005E,K200701_006E", ImmutableList.of(add, add))
          .put("S0201_124E,S0201_125E,S0201_126E,S0201_119E", ImmutableList.of(add, add, percent))
          .put(
              "S0701_C03_012E,S0701_C04_012E,S0701_C05_012E,S0701_C01_012E",
              ImmutableList.of(add, add, percent))
          .put(
              "S0701_C03_013E,S0701_C04_013E,S0701_C05_013E,S0701_C01_013E",
              ImmutableList.of(add, add, percent))
          .put(
              "P014001,P014021,P014022,P014042,P014043",
              ImmutableList.of(rightSubtract, rightSubtract, rightSubtract, rightSubtract))
          .build();

  private String reformatDataArray(String data, String dataIdentifier, boolean isCountyQuery)
      throws InvalidObjectException {
    if (!dataRowToReformatFunction.containsKey(dataIdentifier)) {
      return data; // This data doesn't need reformatting
    }
    if ((dataRowToReformatFunction.get(dataIdentifier).size() + 1)
        != dataIdentifier.split(",").length) {
      // We should have enough functions listed to apply them to each group
      // of two rows - (a, b) and then (their product, c), etc.
      throw new InvalidObjectException(
          "There aren't the right number of functions to apply to these data columns.");
    }

    // Convert from the census API's JSON string to a Java matrix
    Gson gson = new Gson();
    Type dataArrayType = new TypeToken<ArrayList<List<String>>>() {}.getType();
    ArrayList<List<String>> originalDataArray = gson.fromJson(data, dataArrayType);
    ArrayList<List<String>> newDataArray = new ArrayList<List<String>>();

    // Create a new matrix to contain the reformatted data. Add in the the first column, which is
    // the string identifier of the location, and the second column, the first numerical value
    for (int i = 0; i < originalDataArray.size(); i++) {
      List<String> originalDataRow = originalDataArray.get(i);
      List<String> newDataRow = new ArrayList<String>();
      newDataRow.add(originalDataRow.get(0));
      newDataRow.add(originalDataRow.get(1));
      newDataArray.add(newDataRow);
    }

    // Combine the original numbers, skipping the header row, by iterating over the functions
    // given for these data columns. For each row, we successively combine the next datapoint
    // with the previous result, finally resulting in one single fully-combined data point per row.
    List<BiFunction> numberCombiners = dataRowToReformatFunction.get(dataIdentifier);
    for (int i = 0; i < numberCombiners.size(); i++) { // Moving across columns combining numbers
      BiFunction numberCombiner = numberCombiners.get(i);
      for (int j = 1; j < originalDataArray.size(); j++) { // Moving down each row
        List<String> originalDataRow = originalDataArray.get(j);
        List<String> newDataRow = newDataArray.get(j);
        if (newDataRow.get(1) == null || newDataRow.get(1).startsWith("-")) {
          // Sometimes the census API returns missing or negative numbers by mistake;
          // these get cleaned up in the JavaScript
          newDataRow.set(1, "-1");
        } else {
          try {
            int newValue =
                (int)
                    numberCombiner.apply(
                        Float.parseFloat(newDataRow.get(1)), // Always replacing previous value
                        Float.parseFloat(
                            originalDataRow.get(i + 2))); // Moving along list of original values,
                            // skipping name column and the first number (already in newData)
            newDataRow.set(1, String.valueOf(newValue)); // Replace previous value
          } catch (NumberFormatException e) {
            newDataRow.set(1, "-1");
          }
        }
      }
    }

    // Add remaining identifier columns (state and county numbers)
    for (int i = 0; i < originalDataArray.size(); i++) {
      List<String> originalDataRow = originalDataArray.get(i);
      List<String> newDataRow = newDataArray.get(i);
      newDataRow.add(originalDataRow.get(numberCombiners.size() + 2));
      if (isCountyQuery) {
        newDataRow.add(originalDataRow.get(numberCombiners.size() + 3));
      }
    }

    // Convert back into a JSON string for the JavaScript to read
    String jsonData = gson.toJson(newDataArray);
    return jsonData;
  }
}
