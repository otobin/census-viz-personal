package com.google.sps.data;

public class HistoryElement {
  String id;
  String personType;
  String action;
  String location;
  String year;

  public HistoryElement(String id, String personType, String action, String location, String year) {
    this.id = id;
    this.personType = personType;
    this.action = action;
    this.location = location;
    this.year = year;
  }

  public String getId() {
    return id;
  }

  public String getPersonType() {
    return personType;
  }
  
  public String getAction() {
    return action;
  }

  public String getLocation() {
    return location;
  }
  
  public String getYear() {
    return year;
  }

  public boolean equals(HistoryElement otherElement) {
    String otherPersonType = otherElement.getPersonType();
    String otherAction = otherElement.getAction();
    String otherLocation = otherElement.getLocation();
    String otherYear = otherElement.getYear();
    return ((getPersonType().equals(otherPersonType)) && 
        (getAction().equals(action)) && 
        (getLocation().equals(otherLocation)) &&
        (getYear().equals(otherYear)));
  }
}