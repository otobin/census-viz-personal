package com.google.sps.data;

import com.googlecode.objectify.annotation.Cache;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;
import java.util.List;

@Entity
@Cache
public class CensusData {
  @Id String query;
  String data;
  String tableLink;

  private CensusData() {}

  public CensusData(String query, String data, String tableLink) {
    this.query = query;
    this.data = data;
    this.tableLink = tableLink;
  }

  public String getData() {
    return data;
  }

  public String getTableLink() {
    return tableLink;
  }
  
}
