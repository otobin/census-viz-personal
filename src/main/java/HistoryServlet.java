import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.google.gson.Gson;
import com.google.sps.data.History;
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
    String userId = request.getParameter("user-id");
    History userHistoryObj = new History(userId);
    ArrayList<HistoryElement> historyList = userHistoryObj.getHistoryList();
    String json = new Gson().toJson(historyList);
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
