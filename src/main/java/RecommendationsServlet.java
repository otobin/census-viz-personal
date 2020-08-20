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
import java.lang.String;

@WebServlet("/recommendations")
public class RecommendationsServlet extends HttpServlet {

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // Go through datastore count the number of occurances 
    // for all the queries from the user. 
    Map<String, int> personTypeOccurances = new HashMap<String, integer>();
    Map<String, int> actionOccurances = new HashMap<String, integer>();
    Map<String, int> locationOccurances = new HashMap<String, integer>();
    Map<String, int> yearOccurances = new HashMap<String, integer>();
    
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
