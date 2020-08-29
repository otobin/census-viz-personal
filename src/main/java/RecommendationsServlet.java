import com.google.gson.Gson;
import com.google.sps.data.History;
import com.google.sps.data.VisualizationData;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/recommendations")
public class RecommendationsServlet extends HttpServlet {
  private ArrayList<String> personType =
      new ArrayList<String>(Arrays.asList("under-18", "over-18", "all-ages", "male", "female"));
  private ArrayList<String> action = new ArrayList<String>(Arrays.asList("live", "work", "moved"));
  private ArrayList<String> location =
      new ArrayList<String>(
          Arrays.asList(
              "state", "01", "02", "04", "05", "06", "08", "09", "10", "11", "12", "13", "15", "16",
              "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
              "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "44", "45",
              "46", "47", "48", "49", "50", "51", "53", "54", "55", "56"));
  private ArrayList<String> years =
      new ArrayList<String>(
          Arrays.asList("2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018"));
  private HashMap<String, Integer> personTypeMap = new HashMap<String, Integer>();
  private HashMap<String, Integer> actionMap = new HashMap<String, Integer>();
  private HashMap<String, Integer> locationMap = new HashMap<String, Integer>();
  private HashMap<String, Integer> yearsMap = new HashMap<String, Integer>();

  // if the user doesn't have any history to draw from to get recommendations,
  // return default recommendations that would be applicable to most users which is
  // the number of children, adults, people, men, and women who lived in each
  // US state in 2018
  private ArrayList<VisualizationData> getDefaultRecommendations(String userId) {
    ArrayList<VisualizationData> defaultRecommendations = new ArrayList<VisualizationData>();
    for (String person : personType) {
      defaultRecommendations.add(new VisualizationData(userId, person, "live", "state", "2018"));
    }
    return defaultRecommendations;
  }

  // uses java.util.random to get a random integer between
  // 0 and upperBound-1 in order to access a random element
  // for each of the options
  private int getRandomInt(int upperBound) {
    return new Random().nextInt(upperBound);
  }

  // Check to see if the current recommendation is valid by making sure that it isn't an impossible
  // combination
  // and isn't already one that the user has viewed.
  private boolean isRecommendationValid(
      VisualizationData recommendation, ArrayList<VisualizationData> userHistory) {
    return (!(userHistory.contains(recommendation)
        || (recommendation.getPersonType() == "under-18" && recommendation.getAction() == "work")
        || (recommendation.getPersonType() == "under-18" && recommendation.getAction() == "moved")
        || (recommendation.getPersonType() == "over-18" && recommendation.getAction() == "moved")));
  }

  // Returns a VisualizationData whose contents are completely random
  // in order to alleviate recommendation fatigue.
  private VisualizationData getRandomRecommendation(
      String userId, ArrayList<VisualizationData> userHistory) {
    ArrayList<VisualizationData> unuseableRecommendations = new ArrayList<VisualizationData>();
    int maxVisualizations = personType.size() * action.size() * location.size() * years.size();
    while (unuseableRecommendations.size() < maxVisualizations) {
      String randomPersonType = personType.get(getRandomInt(personType.size()));
      String randomAction = action.get(getRandomInt(action.size()));
      String randomLocation = location.get(getRandomInt(location.size()));
      String randomYear = years.get(getRandomInt(years.size()));
      VisualizationData randomRecommendation =
          new VisualizationData(userId, randomPersonType, randomAction, randomLocation, randomYear);
      if (isRecommendationValid(randomRecommendation, userHistory)
          && !unuseableRecommendations.contains(randomRecommendation)) {
        return randomRecommendation;
      }
      unuseableRecommendations.add(randomRecommendation);
    }
    return userHistory.get(0);
  }

  private void updateFrequencyMaps(ArrayList<VisualizationData> userHistory) {
    // calculate the frequencies of each type of query that the user has made
    for (int i = 0; i < userHistory.size(); i++) {
      VisualizationData currentElement = userHistory.get(i);
      personTypeMap.merge(currentElement.getPersonType(), 1, Integer::sum);
      actionMap.merge(currentElement.getAction(), 1, Integer::sum);
      locationMap.merge(currentElement.getLocation(), 1, Integer::sum);
      yearsMap.merge(currentElement.getYear(), 1, Integer::sum);
    }
  }

  // Takes in a hashmap and returns a linkedHashMap sorted by value in descending order such that
  // the most frequented query types are first in the list
  private LinkedHashMap<String, Integer> sortHashMapDescending(
      HashMap<String, Integer> frequencyMap) {
    LinkedHashMap<String, Integer> reverseSortedMap = new LinkedHashMap<>();
    frequencyMap.entrySet().stream()
        .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
        .forEachOrdered(x -> reverseSortedMap.put(x.getKey(), x.getValue()));
    return reverseSortedMap;
  }

  // Return 5 recommendations based on the contents of the user's history.
  // If the user's history is completely empty, return 4 default values and one random
  // visualization.
  // If the user has history populated by some entities, iterate through the most searched fields in
  // each
  // map to create combinations of people, actions, years, and locations that the user hasn't
  // searched yet.
  private ArrayList<VisualizationData> getRecommendations(
      ArrayList<VisualizationData> userHistory, String userId) {
    // If the user's history is completely empty, return 4 default values and one random
    // visualization.
    if (userHistory.isEmpty()) {
      ArrayList<VisualizationData> defaultRecs = getDefaultRecommendations(userId);
      defaultRecs.add(getRandomRecommendation(userId, userHistory));
      return defaultRecs;
    }
    // Populate the frequency maps for each field
    updateFrequencyMaps(userHistory);
    // Sort the frequency maps in descending order by value such that the most common searches for
    // each field
    // are first eg: {worked in: 7, lived in: 10, moved to: 2} => { lived in: 10, worked in: 7,
    // moved to: 2}
    LinkedHashMap<String, Integer> reverseSortedPersonType = sortHashMapDescending(personTypeMap);
    LinkedHashMap<String, Integer> reverseSortedAction = sortHashMapDescending(actionMap);
    LinkedHashMap<String, Integer> reverseSortedLocation = sortHashMapDescending(locationMap);
    LinkedHashMap<String, Integer> reverseSortedYear = sortHashMapDescending(yearsMap);
    // Get the keyset from each frequency map with the guaranteed order from sorting
    Set<String> personTypeKeys = reverseSortedPersonType.keySet();
    Set<String> actionKeys = reverseSortedAction.keySet();
    Set<String> locationKeys = reverseSortedLocation.keySet();
    Set<String> yearKeys = reverseSortedYear.keySet();
    ArrayList<VisualizationData> recommendationList = new ArrayList<VisualizationData>();
    // Iterate through all fields and find combinations that the user hasn't made yet
    // and return the top 4.
    for (String personType : personTypeKeys) {
      for (String action : actionKeys) {
        for (String location : locationKeys) {
          for (String year : yearKeys) {
            VisualizationData recommendation =
                new VisualizationData(userId, personType, action, location, year);
            if (isRecommendationValid(recommendation, userHistory)) {
              recommendationList.add(recommendation);
              if (recommendationList.size() >= 4) {
                recommendationList.add(getRandomRecommendation(userId, userHistory));
                return recommendationList;
              }
            }
          }
        }
      }
    }
    // When the user has very similar queries in their search history, the recommendation algorithm
    // may not generate 4. In this case, populate the remaining recommendations of the 5 with random
    // ones.
    if (recommendationList.size() < 4) {
      for (int i = 0; i < 5 - recommendationList.size(); i++) {
        recommendationList.add(getRandomRecommendation(userId, userHistory));
      }
    }
    return recommendationList;
  }

  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String userId = request.getParameter("user-id");
    History userHistoryObj = new History(userId);
    ArrayList<VisualizationData> userHistory = userHistoryObj.getHistoryList();
    ArrayList<VisualizationData> recommendations = getRecommendations(userHistory, userId);
    String json = new Gson().toJson(recommendations);
    response.getWriter().write(json);
  }
}

