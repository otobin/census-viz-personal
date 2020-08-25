import com.google.gson.JsonObject;
import com.google.gson.Gson;
import com.google.sps.data.HistoryElement;
import com.google.sps.data.History;
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
import java.util.Random;

@WebServlet("/recommendations")
public class RecommendationsServlet extends HttpServlet {

  // uses java.util.random to get a random integer between 
  // 0 and upperBound-1 in order to access a random element 
  // for each of the options
  private int getRandomInt(int upperBound) {
    Random randomObject = new Random();
    int randomInt = randomObject.nextInt(upperBound);
    return randomInt;
  }

  // Returns a HistoryElement whose contents are completely random
  // in order to alleviate recommendation fatigue. 
  private HistoryElement getRandomRecommendation(String userId) {
    History userHistory = new History(userId);
    ArrayList<HistoryElement> userHistoryList = userHistory.getHistoryList();
    ArrayList<String> personType = new ArrayList<String>(
      Arrays.asList("under-18", "over-18", "all-ages", "male", "female"));
    ArrayList<String> action = new ArrayList<String>(
      Arrays.asList("live", "work", "moved"));
    ArrayList<String> location = new ArrayList<String>(
      Arrays.asList("state","01","02","04","05","06","08","09","10","11","12","13","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42", "44", "45", "46","47","48","49","50","51","53","54","55","56"));
    ArrayList<String> years = new ArrayList<String> (
      Arrays.asList("2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018")); 
    boolean foundCombination = false;
    HistoryElement randomRecommendation = userHistoryList.get(0);
    while (!foundCombination) {
      String randomPersonType = personType.get(getRandomInt(personType.size()));
      String randomAction = action.get(getRandomInt(action.size()));
      String randomLocation = location.get(getRandomInt(location.size()));
      String randomYear = years.get(getRandomInt(years.size()));
      randomRecommendation = new HistoryElement(
          userId, randomPersonType, randomAction, randomLocation, randomYear);
      // Check that the History element can be found in our database and isn't one
      // that the user has already viewed.
      if (!(userHistoryList.contains(randomRecommendation) || 
        (randomPersonType == "under-18" && randomAction == "work") ||
        (randomPersonType == "under-18" && randomAction == "moved"))) {
        return randomRecommendation;
      }
    }
    return randomRecommendation;
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String userId = request.getParameter("user-id");
    HistoryElement randomElement = getRandomRecommendation(userId);
    ArrayList<HistoryElement> recommendations = new ArrayList<HistoryElement>(
        Arrays.asList(randomElement));
    String json = new Gson().toJson(recommendations);
    response.getWriter().write(json);
  }

}

