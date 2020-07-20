import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

/** Servlet that handles census queries from users */
@WebServlet("/query")
public class QueryServlet extends HttpServlet {

  // Hardcoded initial choices for which data tables are accessed
  Map<String, List<String>> groupSelector = new HashMap<String, ArrayList<String>(
      "under-18", new ArrayList<String>(List.of("/subject"), "S0101_C01_022E"),
      "over-18", new ArrayList<String>(List.of("/subject"), "S0101_C01_026E"),
      "all-ages", new ArrayList<String>(List.of("/subject"), "S0101_C01_001E"),
  );

  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
      String personType = request.getParameter("person-type");
      String location = request.getParameter("location");

      List<String> dataVars = groupSelector.get(personType);
      dataTableType = dataVars.get(0);
      dataTableID = dataVars.get(1);

      String fetchURL = "https://api.census.gov/data/2018/acs/acs1" 
          + dataTableType + "?get=NAME," + dataTableID + "&for=" + location +
          ":*&key=ea65020114ffc1e71e760341a0285f99e73eabbc";
  }
}