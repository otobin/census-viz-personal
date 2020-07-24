import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import com.google.gson.Gson;
import com.google.common.collect.ImmutableMap;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Stream;
import java.util.stream.Collectors;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Servlet that handles census queries from users */
@WebServlet("/query")
public class QueryServlet extends HttpServlet {

  // Hardcoded initial choices for which lines of the data table are accessed
  Map<String, Map<String, String>> queryToDataRow = 
  ImmutableMap.of(
      "live", ImmutableMap.of("under-18", "023E", "over-18", "026E", "all-ages", "001E"),
      "work", ImmutableMap.of("over-18", "154E,S0201_157E"),
     "moved", ImmutableMap.of("all-ages", "119E,S0201_126E"));

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String personType = request.getParameter("person-type");
    String action = request.getParameter("action");
    String location = request.getParameter("location");
  
    if (!queryToDataRow.containsKey(action)
        || !queryToDataRow.get(action).containsKey(personType)) { 
      // We don't have a data table for this query
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    URL fetchUrl = 
      new URL(
        "https://api.census.gov/data/2018/acs/acs1/spp?get=NAME,S0201_" 
          + queryToDataRow.get(action).get(personType)
          + "&for=" 
          + location 
          + ":*&key=ea65020114ffc1e71e760341a0285f99e73eabbc");

    HttpURLConnection connection = (HttpURLConnection) fetchUrl.openConnection();
    connection.setRequestMethod("GET");

    if (connection.getResponseCode() > 299) {
      // An error occurred
      response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
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

      response.setContentType("application/json;");
      Gson gson = new Gson();
      response.getWriter().println(gson.toJson(data));
    }
  }
}
