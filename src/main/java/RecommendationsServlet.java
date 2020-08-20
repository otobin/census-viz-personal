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

  // Go through the datastore and map each 
  public Map<String, Map<String, int>> getQueryFrequency(userId) {
    Map<String, Map<String, int>> = new HashMap<String, Map<String, int>>();
    
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    Query query = new Query("historyEntity");
    PreparedQuery results = datastore.prepare(query);
    for (Entity : results.asIterable()) {
        String entityUserId = (String) entity.getProperty("userId");
        if (entityUserId != null && userId != null) {
          if (entityUserId.equals(userId)) {

    }
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    Query query = new Query("historyEntity");
    PreparedQuery results = datastore.prepare(query);

    List<HistoryElement> queryList = new ArrayList<HistoryElement>();
    for (Entity entity : results.asIterable()) {
      String entityUserId = (String) entity.getProperty("userId");
        if (entityUserId != null && userId != null) {
          if (entityUserId.equals(userId)) {
            String entityPersonType = (String) entity.getProperty("personType");
            String entityAction = (String) entity.getProperty("action");
            String entityLocation = (String) entity.getProperty("location");
            String entityYear = (String) entity.getProperty("year");
            HistoryElement dataHistoryElement = new HistoryElement(entityUserId, 
              entityPersonType,entityAction, entityLocation, entityYear);
            // Check to see if it is already in the results to eliminate duplicates
            if (!queryList.contains(dataHistoryElement)) {
              queryList.add(dataHistoryElement);
            }
          }
      }
    }
    String json = new Gson().toJson(queryList);
    response.getWriter().write(json);
  }
}
