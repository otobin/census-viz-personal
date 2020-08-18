package com.google.sps.servlets;
import com.google.gson.JsonObject;
import com.google.gson.Gson;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;

/** Data servlet that adds comments to datastore via the post function and 
    displays previous comments via the post function.  */
@WebServlet("/history")
public class HistoryServlet extends HttpServlet {
  
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    UserService userService = UserServiceFactory.getUserService();
    if (userService.isUserLoggedIn()) {
      User user = userService.getCurrentUser();
      String userId = user.getUserId();
      DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
      Query query = new Query("historyEntity");
      PreparedQuery results = datastore.prepare(query);

      List<List<String>> queryList = new ArrayList<List<String>>();
      for (Entity entity : results.asIterable()) {
          String entityUserId = (String) entity.getProperty("userId");
          if (entityUserId == userId) {
            String personType = (String) entity.getProperty("personType");
            String action = (String) entity.getProperty("action");
            String location = (String) entity.getProperty("location");
            String year = (String) entity.getProperty("year");
            List<String> queryPropertyList = Arrays.asList(personType, action, location, year);
            queryList.add(queryPropertyList);
          }
      }
      String json = new Gson().toJson(queryList);
      response.getWriter().write(json);
    }
  }

  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    UserService userService = UserServiceFactory.getUserService();
    if (userService.isUserLoggedIn()) {
        User user = userService.getCurrentUser();
        String userId = (String) user.getUserId();
        String personType = request.getParameter("person-type");
        String action = request.getParameter("action");
        String location = request.getParameter("location");
        String year = request.getParameter("year");

        Entity historyEntity = new Entity("historyEntity");
        historyEntity.setProperty("userId", userId);
        historyEntity.setProperty("personType", personType);
        historyEntity.setProperty("action", action);
        historyEntity.setProperty("location", location);
        historyEntity.setProperty("year", year);

        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        datastore.put(historyEntity);

        response.getWriter().println("Yooo");
        response.sendRedirect("/index.html");
    } else {
      response.getWriter().println("Yooo2");
      response.sendRedirect("/index.html");
    }
  }
}
