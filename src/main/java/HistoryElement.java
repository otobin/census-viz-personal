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

  @Override
  public boolean equals(Object other) {
    HistoryElement otherElement = (HistoryElement)other;
    String otherPersonType = otherElement.getPersonType();
    String otherAction = otherElement.getAction();
    String otherLocation = otherElement.getLocation();
    String otherYear = otherElement.getYear();
    return ((this.personType.equals(otherPersonType)) && 
        (this.action.equals(action)) && 
        (this.location.equals(otherLocation)) &&
        (this.year.equals(otherYear)));
  }
}