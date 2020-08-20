import com.google.sps.data.CensusData;
import com.googlecode.objectify.ObjectifyService;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

public class ObjectifyInit implements ServletContextListener {
  public void contextInitialized(ServletContextEvent event) {
    ObjectifyService.init();
    ObjectifyService.register(CensusData.class);
  }

  public void contextDestroyed(ServletContextEvent event) {
    // App Engine does not currently invoke this method.
  }
}
