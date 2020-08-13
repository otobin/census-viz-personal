package com.google.sps.data;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.InvalidObjectException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

// Reformats data from the QueryServlet according to a hard-coded list of instructions
public class DataFormatter {

  // Generic functions to combine numbers.
  private static BiFunction<Double, Double, Double> add = (Double a, Double b) -> a + b;
  private static BiFunction<Double, Double, Double> rightSubtract = (Double a, Double b) -> a - b;
  private static BiFunction<Double, Double, Double> percent =
      (Double a, Double b) -> (a / 100.0) * b;

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
    ArrayList<List<Double>> newDataArray = new ArrayList<List<Double>>();

    // Create a new matrix to contain the reformatted data,
    // moving down the rows but skipping the header row
    for (int i = 1; i < originalDataArray.size(); i++) {
      List<String> originalDataRow = originalDataArray.get(i);
      List<Double> newDataRow = new ArrayList<Double>();

      // Moving across each row; we only iterate through the numbers, skipping
      // the initial identifier string and the last one or two state & county identifiers
      for (int j = 1; j < originalDataRow.size() - (isCountyQuery ? 2 : 1); j++) {
        String originalDataPoint = originalDataRow.get(j);
        if (originalDataPoint == null || originalDataPoint.startsWith("-")) {
          // Sometimes the census API returns missing or negative numbers by mistake;
          // these get cleaned up in the JavaScript
          newDataRow.add(-1.0);
        } else {
          try {
            newDataRow.add(Double.parseDouble(originalDataPoint));
          } catch (NumberFormatException e) {
            newDataRow.add(-1.0);
          }
        }
      }

      newDataArray.add(newDataRow);
    }

    // Combine the original numbers, skipping the header row, by iterating over the functions
    // given for these data columns. For each row, we successively combine the next datapoint
    // with the previous result, finally resulting in one single fully-combined data point per row.
    List<BiFunction> numberCombiners = dataRowToReformatFunction.get(dataIdentifier);
    for (int i = 0; i < numberCombiners.size(); i++) { // Moving across columns combining numbers
      BiFunction numberCombiner = numberCombiners.get(i);
      for (int j = 0; j < originalDataArray.size() - 1; j++) { // Moving down through the rows
        List<Double> newDataRow = newDataArray.get(j);
        // We always combine onto the first item in the data row, but combining it
        // the second, third, etc. item as we iterate
        Double newDataPoint =
            (double) numberCombiner.apply(newDataRow.get(0), newDataRow.get(i + 1));
        newDataRow.set(0, newDataPoint);
      }
    }

    // Now we have the final number; create a new String array and copy in identifying
    // info, plus the final number as a string
    ArrayList<List<String>> finalDataArray = new ArrayList<List<String>>();
    for (int i = 0; i < originalDataArray.size(); i++) {
      List<String> originalDataRow = originalDataArray.get(i);
      List<String> finalDataRow = new ArrayList<String>();
      finalDataRow.add(originalDataRow.get(0)); // identifier string

      if (i == 0) { // header row
        finalDataRow.add("Number");
      } else {
        List<Double> numberDataRow = newDataArray.get(i - 1); // since it skipped header row
        finalDataRow.add(String.valueOf(Math.round(numberDataRow.get(0)))); // final number
      }

      // We have one fewer number combiner than we have numbers, so increasing
      // its size by two gives us the first non-number row
      finalDataRow.add(originalDataRow.get(numberCombiners.size() + 2)); // state ID
      if (isCountyQuery) {
        finalDataRow.add(originalDataRow.get(numberCombiners.size() + 3)); // county ID
      }
      finalDataArray.add(finalDataRow);
    }

    // Convert back into a JSON string for the JavaScript to read
    String jsonData = gson.toJson(finalDataArray);
    return jsonData;
  }
}
