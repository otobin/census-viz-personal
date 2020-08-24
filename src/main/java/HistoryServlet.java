import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.google.gson.Gson;
import com.google.sps.data.HistoryElement;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/history")
public class HistoryServlet extends HttpServlet {

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // Get queries with the user's id from the database
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    String userId = request.getParameter("user-id");
    Filter propertyFilter = new FilterPredicate("userId", FilterOperator.EQUAL, userId);
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
        HistoryElement dataHistoryElement = 
          new HistoryElement(
            entityUserId, entityPersonType,entityAction, entityLocation, entityYear);
        // Check to see if it is already in the results to eliminate duplicates
        if (!queryList.contains(dataHistoryElement)) {
          queryList.add(dataHistoryElement);
        }
      }
    }
    String json = new Gson().toJson(queryList);
    response.getWriter().write(json);
  }

  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Entity historyEntity = new Entity("historyEntity");
    historyEntity.setProperty("personType", request.getParameter("person-type"));
    historyEntity.setProperty("action", request.getParameter("action"));
    historyEntity.setProperty("location", request.getParameter("location"));
    historyEntity.setProperty("year", request.getParameter("year"));
    historyEntity.setProperty("userId", request.getParameter("user-id"));

    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    datastore.put(historyEntity);
  }
}
