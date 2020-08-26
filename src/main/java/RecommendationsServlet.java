import com.google.gson.JsonObject;
import com.google.gson.Gson;
import com.google.sps.data.VisualizationData;
import com.google.sps.data.History;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.Arrays;
import java.lang.String;
import java.util.Random;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@WebServlet("/recommendations")
public class RecommendationsServlet extends HttpServlet {
  private ArrayList<String> personType = new ArrayList<String>(
    Arrays.asList("under-18", "over-18", "all-ages", "male", "female"));
  private ArrayList<String> action = new ArrayList<String>(
    Arrays.asList("live", "work", "moved"));
  private ArrayList<String> location = new ArrayList<String>(
    Arrays.asList("state", "01", "02", "04", "05", "06", "08",
    "09", "10", "11", "12", "13", "15", "16", "17", "18", "19",
    "20", "21", "22", "23", "24", "25", "26", "27", "28", "29",
    "30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
    "40", "41", "42", "44", "45", "46", "47", "48", "49", "50",
    "51", "53", "54", "55", "56"));
  private ArrayList<String> years = new ArrayList<String> (
    Arrays.asList("2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018")); 
  private HashMap<String, Integer> personTypeMap = new HashMap<String, Integer>();
  private HashMap<String, Integer> actionMap = new HashMap<String, Integer>();
  private HashMap<String, Integer> locationMap = new HashMap<String, Integer>(); 
  private HashMap<String, Integer> yearsMap = new HashMap<String, Integer>(); 

  // if the user doesn't have any history to draw from to get recommendations, 
  // return default recommendations that would be applicable to most users which is
  // the number of children, adults, people, men, and women who lived in each 
  // US state in 2018. 
  private ArrayList<VisualizationData> getDefaultRecommendations(String userId) {
    ArrayList<VisualizationData> defaultRecommendations = new ArrayList<VisualizationData>();
    for (String person: personType) {
      defaultRecommendations.add(new VisualizationData(userId, person, "live", "state", "2018"));
    }
    return defaultRecommendations;
  }

  // uses java.util.random to get a random integer between 
  // 0 and upperBound-1 in order to access a random element 
  // for each of the options
  private int getRandomInt(int upperBound) {
    Random randomObject = new Random();
    int randomInt = randomObject.nextInt(upperBound);
    return randomInt;
  }

  // CHeck to see if the current recommendation is valid by making sure that it isn't an impossible combination 
  // and isn't already one that the user has viewed.
  private boolean isRecommendationValid(VisualizationData recommendation, ArrayList<VisualizationData> userHistory) {
      return (!(userHistory.contains(recommendation) || 
        (recommendation.getPersonType() == "under-18" && recommendation.getAction() == "work") ||
        (recommendation.getPersonType() == "under-18" && recommendation.getAction() == "moved"))); 
  }

  // Returns a VisualizationData whose contents are completely random
  // in order to alleviate recommendation fatigue. 
  private VisualizationData getRandomRecommendation(String userId, ArrayList<VisualizationData> userHistory) {
    ArrayList<VisualizationData> invalidRecommendations = new ArrayList<VisualizationData>();
    boolean isValid = false;
    while (!isValid) {
      String randomPersonType = personType.get(getRandomInt(personType.size()));
      String randomAction = action.get(getRandomInt(action.size()));
      String randomLocation = location.get(getRandomInt(location.size()));
      String randomYear = years.get(getRandomInt(years.size()));
      VisualizationData randomRecommendation = new VisualizationData(
          userId, randomPersonType, randomAction, randomLocation, randomYear);
      if (isRecommendationValid(randomRecommendation, userHistory) && !invalidRecommendations.contains(randomRecommendation)) {
        return randomRecommendation;
      } else {
        invalidRecommendations.add(randomRecommendation);
      }
      // If the user has looked at every visualization, return the first in the history.
      if (invalidRecommendations.size() >= 6885) {
        isValid = true;
      }
    }
    return userHistory.get(0);
  }

  // Takes in a map and updates the key/value pairs
  private void updateMap(HashMap<String, Integer> frequencyMap, String item) {
    if (frequencyMap.containsKey(item)) {
      frequencyMap.put(item, frequencyMap.get(item) + 1);
    } else {
      frequencyMap.put(item, 1);
    }
  }

  private void getFrequencyMaps(ArrayList<VisualizationData> userHistory) {
    // calculate the frequencies of each type of query that the user has made
    for (int i = 0; i < userHistory.size(); i++) {
      VisualizationData currentElement = userHistory.get(i);
      updateMap(personTypeMap, currentElement.getPersonType());
      updateMap(actionMap, currentElement.getAction());
      updateMap(locationMap, currentElement.getLocation());
      updateMap(yearsMap, currentElement.getYear());
    }
  }

  // Takes in a hashmap and returns a linkedHashMap sorted by value in descending order such that 
  // the most frequented query types are first in the list
  private LinkedHashMap<String, Integer> sortHashMapDescending(HashMap<String, Integer> frequencyMap) {
    LinkedHashMap<String, Integer> reverseSortedMap = new LinkedHashMap<>();
        frequencyMap.entrySet().stream().sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .forEachOrdered(x -> reverseSortedMap.put(x.getKey(), x.getValue()));
    return reverseSortedMap;
  }

  // Return suggested recommendations based on the history. Create hashmaps for each input for all of the queries,
  // then create four combinations based on the most frequented fields.
  private ArrayList<VisualizationData> getRecommendations(ArrayList<VisualizationData> userHistory, String userId) {
    getFrequencyMaps(userHistory);
    LinkedHashMap<String, Integer> reverseSortedPersonType = sortHashMapDescending(personTypeMap);
    LinkedHashMap<String, Integer> reverseSortedAction = sortHashMapDescending(actionMap);
    LinkedHashMap<String, Integer> reverseSortedLocation = sortHashMapDescending(locationMap);
    LinkedHashMap<String, Integer> reverseSortedYear = sortHashMapDescending(yearsMap);
    Set<String> personTypeKeys = reverseSortedPersonType.keySet();
    Set<String> actionKeys = reverseSortedAction.keySet();
    Set<String> locationKeys = reverseSortedLocation.keySet();
    Set<String> yearKeys = reverseSortedYear.keySet();
    ArrayList<VisualizationData> recommendationList = new ArrayList<VisualizationData>();
    for (String personType : personTypeKeys) {
      for(String action : actionKeys) {
        for (String location : locationKeys) {
          for (String year : yearKeys) {
            VisualizationData recommendation = new VisualizationData(userId, personType, action, location, year);
             if (isRecommendationValid(recommendation, userHistory)) {
               recommendationList.add(recommendation);
               if (recommendationList.size() > 3) {
                 return recommendationList;
               }
             }
          }
        }
      }
    }
    return recommendationList;
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String userId = request.getParameter("user-id");
    History userHistoryObj = new History(userId);
    ArrayList<VisualizationData> userHistory = userHistoryObj.getHistoryList();
    if (userHistory.isEmpty()) {
      String json = new Gson().toJson(getDefaultRecommendations(userId));
      response.getWriter().write(json);
    } else {
      ArrayList<VisualizationData> recommendations = getRecommendations(userHistory, userId);
      VisualizationData randomRecommendation = getRandomRecommendation(userId, userHistory);
      recommendations.add(randomRecommendation);
      String json = new Gson().toJson(recommendations);
      response.getWriter().write(json);
    }
  }

}

