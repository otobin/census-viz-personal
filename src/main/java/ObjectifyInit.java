import com.google.cloud.datastore.DatastoreOptions;
import com.googlecode.objectify.ObjectifyFactory;
import com.googlecode.objectify.ObjectifyService;
import com.google.sps.data.CensusData;
import javax.servlet.ServletContextListener;
import javax.servlet.ServletContextEvent;


public class ObjectifyInit implements ServletContextListener {
	public void contextInitialized(ServletContextEvent event) {
		ObjectifyService.init(new ObjectifyFactory(
      DatastoreOptions.newBuilder()
        .setHost("http://localhost:8484")
        .setProjectId("censusviz")
        .build()
        .getService()
	  ));
    ObjectifyService.register(CensusData.class);
	}

	public void contextDestroyed(ServletContextEvent event) {
    // App Engine does not currently invoke this method.
  }
}
