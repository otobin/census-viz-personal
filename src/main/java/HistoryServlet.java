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
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.lang.String;

@WebServlet("/history")
public class HistoryServlet extends HttpServlet {

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // Put the current query from the user in datastore
    String personType = request.getParameter("person-type");
    String action = request.getParameter("action");
    String location = request.getParameter("location");
    String year = request.getParameter("year");
    String userId = request.getParameter("user-id");

    Entity historyEntity = new Entity("historyEntity");
    historyEntity.setProperty("personType", personType);
    historyEntity.setProperty("action", action);
    historyEntity.setProperty("location", location);
    historyEntity.setProperty("year", year);
    historyEntity.setProperty("userId", userId);
    
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    datastore.put(historyEntity);

    // Get queries with the user's id from the database
    Filter propertyFilter =
    new FilterPredicate("userId", FilterOperator.EQUAL, userId);
    Query query = new Query("historyEntity").setFilter(propertyFilter);
    PreparedQuery results = datastore.prepare(query);

    List<HistoryElement> queryList = new ArrayList<HistoryElement>();
    for (Entity entity : results.asIterable()) {
      String entityUserId = (String) entity.getProperty("userId");
      if (entityUserId != null && userId != null) {
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
    String json = new Gson().toJson(queryList);
    response.getWriter().write(json);
  }
}
