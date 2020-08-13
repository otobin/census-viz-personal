package com.google.sps.data;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.InvalidObjectException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.function.BiFunction;
import java.util.List;
import java.util.Map;

// Reformats data from the QueryServlet according to a hard-coded list of instructions
public class DataFormatter {

  // Generic functions to combine numbers. Note that Math.round returns a long,
  // but we can cast to int (max value ~2 billion) because our numbers
  // will always be smaller than the U.S. population (~330 million)
  private static BiFunction<Float, Float, Integer> add =
      (Float a, Float b) -> (int) Math.round(a + b);
  private static BiFunction<Float, Float, Integer> rightSubtract =
      (Float a, Float b) -> (int) Math.round(a - b);
  private static BiFunction<Float, Float, Integer> percent =
      (Float a, Float b) -> (int) Math.round((a / 100.0) * b);

  // Mapping data columns to the functions we want to execute on them --
  // for example, if we are not able to access the population of children,
  // instead we can do rightSubtract(total population, adult population)
  private static Map<String, List<BiFunction>> dataRowToReformatFunction =
      ImmutableMap.<String, List<BiFunction>>builder()
          .put("DP05_0001E,DP05_0018E", ImmutableList.of(rightSubtract))
          .put("S0201_119E,S0201_126E", ImmutableList.of(percent))
          .put("K200104_001E,K200102_001E", ImmutableList.of(rightSubtract))
          .put("S0701_C04_012E,S0701_C05_012E,S0701_C01_012E", ImmutableList.of(add, percent))
          .put("S0701_C04_013E,S0701_C05_013E,S0701_C01_013E", ImmutableList.of(add, percent))
          .put("S0201_125E,S0201_126E,S0201_119E", ImmutableList.of(add, percent))
          .put("K200701_005E,K200701_006E", ImmutableList.of(add))
          .put("K200701_004E,K200701_005E,K200701_006E", ImmutableList.of(add, add))
          .put("S0201_124E,S0201_125E,S0201_126E,S0201_119E", ImmutableList.of(add, add, percent))
          .put(
              "S0701_C03_012E,S0701_C04_012E,S0701_C05_012E,S0701_C01_012E",
              ImmutableList.of(add, add, percent))
          .put(
              "S0701_C03_013E,S0701_C04_013E,S0701_C05_013E,S0701_C01_013E",
              ImmutableList.of(add, add, percent))
          .put(
              "P014001,P014021,P014022,P014042,P014043",
              ImmutableList.of(rightSubtract, rightSubtract, rightSubtract, rightSubtract))
          .build();

  public static String reformatDataArray(String data, String dataIdentifier, boolean isCountyQuery)
      throws InvalidObjectException {
    if (!dataRowToReformatFunction.containsKey(dataIdentifier)) {
      return data; // This data doesn't need reformatting
    }
    if ((dataRowToReformatFunction.get(dataIdentifier).size() + 1)
        != dataIdentifier.split(",").length) {
      // We should have enough functions listed to apply them to each group
      // of two rows - (a, b) and then (their product, c), etc.
      throw new InvalidObjectException(
          "There aren't the right number of functions to apply to these data columns.");
    }

    // Convert from the census API's JSON string to a Java matrix
    Gson gson = new Gson();
    Type dataArrayType = new TypeToken<ArrayList<List<String>>>() {}.getType();
    ArrayList<List<String>> originalDataArray = gson.fromJson(data, dataArrayType);
    ArrayList<List<String>> newDataArray = new ArrayList<List<String>>();

    // Create a new matrix to contain the reformatted data. Add in the the first column, which is
    // the string identifier of the location, and the second column, the first numerical value
    for (int i = 0; i < originalDataArray.size(); i++) {
      List<String> originalDataRow = originalDataArray.get(i);
      List<String> newDataRow = new ArrayList<String>();
      newDataRow.add(originalDataRow.get(0));
      newDataRow.add(originalDataRow.get(1));
      newDataArray.add(newDataRow);
    }

    // Combine the original numbers, skipping the header row, by iterating over the functions
    // given for these data columns. For each row, we successively combine the next datapoint
    // with the previous result, finally resulting in one single fully-combined data point per row.
    List<BiFunction> numberCombiners = dataRowToReformatFunction.get(dataIdentifier);
    for (int i = 0; i < numberCombiners.size(); i++) { // Moving across columns combining numbers
      BiFunction numberCombiner = numberCombiners.get(i);
      for (int j = 1; j < originalDataArray.size(); j++) { // Moving down each row
        List<String> originalDataRow = originalDataArray.get(j);
        List<String> newDataRow = newDataArray.get(j);
        if (newDataRow.get(1) == null || newDataRow.get(1).startsWith("-")) {
          // Sometimes the census API returns missing or negative numbers by mistake;
          // these get cleaned up in the JavaScript
          newDataRow.set(1, "-1");
        } else {
          try {
            int newValue =
                (int)
                    numberCombiner.apply(
                        Float.parseFloat(newDataRow.get(1)), // Always replacing previous value
                        Float.parseFloat(
                            originalDataRow.get(i + 2))); // Moving along list of original values,
            // skipping name column and the first number (already in newData)
            newDataRow.set(1, String.valueOf(newValue)); // Replace previous value
          } catch (NumberFormatException e) {
            newDataRow.set(1, "-1");
          }
        }
      }
    }

    // Add remaining identifier columns (state and county numbers)
    for (int i = 0; i < originalDataArray.size(); i++) {
      List<String> originalDataRow = originalDataArray.get(i);
      List<String> newDataRow = newDataArray.get(i);
      newDataRow.add(originalDataRow.get(numberCombiners.size() + 2));
      if (isCountyQuery) {
        newDataRow.add(originalDataRow.get(numberCombiners.size() + 3));
      }
    }

    // Convert back into a JSON string for the JavaScript to read
    String jsonData = gson.toJson(newDataArray);
    return jsonData;
  }
}