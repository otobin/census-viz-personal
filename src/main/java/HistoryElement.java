package com.google.sps.data;

public class HistoryElement {
  String userId;
  String personType;
  String action;
  String location;
  String year;

  public HistoryElement(String userId, String personType, String action, String location, String year) {
    this.userId = userId;
    this.personType = personType;
    this.action = action;
    this.location = location;
    this.year = year;
  }

  public String getId() {
    return userId;
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
    HistoryElement otherElement = (HistoryElement) other;
    String otherPersonType = otherElement.getPersonType();
    String otherAction = otherElement.getAction();
    String otherLocation = otherElement.getLocation();
    String otherYear = otherElement.getYear();
    return ((this.personType.equals(otherPersonType))
            && (this.action.equals(otherAction)) 
            && (this.location.equals(otherLocation)) 
            && (this.year.equals(otherYear)));
  }
}
