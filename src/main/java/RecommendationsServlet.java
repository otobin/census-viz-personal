import com.google.gson.JsonObject;
import com.google.gson.Gson;
import com.google.sps.data.HistoryElement;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.PreparedQuery;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import javafx.util.Pair;
import java.lang.String;
import java.util.Random;

@WebServlet("/recommendations")
public class RecommendationsServlet extends HttpServlet {

  // Returns a HistoryElement whose contents are completely random
  // in order to alleviate recommendation fatigue. 
  public HistoryElement getRandomRecommendation() {
    // Create an array of banned pairs to make sure that the function 
    // doesn't return information that we don't have.
    Pair p1 = new Pair("children", "work in");
    Pair p2 = new Pair("children", "moved to");
    ArrayList<Pair> bannedCombinations = new ArrayList<Pair>(Arrays.asList(p1, p2));
    
    ArrayList<String> personType = new ArrayList<String>(
      Arrays.asList("children", "adults", "people", "men", "women"));
    ArrayList<String> action = new ArrayList<String>(
      Arrays.asList("lived in", "worked in", "moved to"));
    ArrayList<String> location = new ArrayList<String>(
      Arrays.asList("Alabama","Alaska","Arizona","Arkansas","California",
      "Colorado","Connecticut","Delaware","District of Columbia", "Florida",
      "Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
      "Louisiana", "Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
      "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
      "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma",
      "Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
      "Wisconsin","Wyoming"));
    ArrayList<String> years = new ArrayList<String> (
      Arrays.asList("2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018")); 

    boolean found = false;
    while (!found) {
      
    }
    
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // Go through datastore count the number of occurances 
    // for all the queries from the user. 
    Map<String, int> personTypeOccurances = new HashMap<String, integer>();
    Map<String, int> actionOccurances = new HashMap<String, integer>();
    Map<String, int> locationOccurances = new HashMap<String, integer>();
    Map<String, int> yearOccurances = new HashMap<String, integer>();
    String locationSetting = request.getParameter("location-settings");
    String userId = request.getParameter("user-id");

    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    Query query = new Query("historyEntity");
    PreparedQuery results = datastore.prepare(query);
    for (Entity entity: results.asIterable()) {
        String entityUserId = (String) entity.getProperty("userId");
        if (entityUserId != null && userId != null) {
          if (entityUserId.equals(userId)) {
            entityPersonType = (String) entity.getProperty("personType");
            if (personTypeOccurances.containsKey(entityPersonType)) {
              personTypeOccurances.put(entityPersonType, map.get(entityPersonType) + 1);
            } else {
              personTypeOccurances.put(entityPersonType, 1);
            }
          }
    }
  }
}
