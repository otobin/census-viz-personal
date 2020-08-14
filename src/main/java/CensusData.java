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
  List<String> queryList;

  private CensusData() {}

  public CensusData(String query, List<String> queryList, String data, String tableLink) {
    this.query = query;
    this.queryList = queryList;
    this.data = data;
    this.tableLink = tableLink;
  }

  public String getData() {
    return data;
  }

  public String getTableLink() {
    return tableLink;
  }

  public List<String> getQueryList() {
    return this.queryList;
  }
}
