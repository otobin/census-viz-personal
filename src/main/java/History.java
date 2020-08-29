package com.google.sps.data;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import java.util.ArrayList;

public class History {
  String userId;
  ArrayList<VisualizationData> historyList;

  public History(String userId) {
    this.userId = userId;
    this.historyList = getHistory(userId);
  }

  public ArrayList<VisualizationData> getHistoryList() {
    return historyList;
  }

  public ArrayList<VisualizationData> getHistory(String userId) {
    // Get queries with the user's id from the database
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    Filter propertyFilter = new FilterPredicate("userId", FilterOperator.EQUAL, userId);
    Query query = new Query("historyEntity").setFilter(propertyFilter);
    PreparedQuery results = datastore.prepare(query);

    ArrayList<VisualizationData> queryList = new ArrayList<VisualizationData>();
    for (Entity entity : results.asIterable()) {
      String entityUserId = (String) entity.getProperty("userId");
      String entityPersonType = (String) entity.getProperty("personType");
      String entityAction = (String) entity.getProperty("action");
      String entityLocation = (String) entity.getProperty("location");
      String entityYear = (String) entity.getProperty("year");
      VisualizationData dataHistoryElement =
          new VisualizationData(
              entityUserId, entityPersonType, entityAction, entityLocation, entityYear);
      // Check to see if it is already in the results to eliminate duplicates
      if (!queryList.contains(dataHistoryElement)) {
        queryList.add(dataHistoryElement);
      }
      return queryList;
    }
  }
}


