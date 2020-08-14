import com.google.cloud.datastore.DatastoreOptions;
import com.google.sps.data.CensusData;
import com.googlecode.objectify.ObjectifyFactory;
import com.googlecode.objectify.ObjectifyService;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

public class ObjectifyInit implements ServletContextListener {
  public void contextInitialized(ServletContextEvent event) {
    // ObjectifyService.init(
    //     new ObjectifyFactory(
    //         DatastoreOptions.newBuilder()
    //             // This host is used for testing using a datastore emulator
    //             .setHost("http://localhost:8484")
    //             .setProjectId("censusviz")
    //             .build()
    //             .getService()));
    // To deploy, everything above this must be commented out
    // and replaced with only ObjectifyService.init();
    ObjectifyService.init();
    ObjectifyService.register(CensusData.class);
  }

  public void contextDestroyed(ServletContextEvent event) {
    // App Engine does not currently invoke this method.
  }
}
