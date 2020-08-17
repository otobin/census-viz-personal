import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import com.google.gson.JsonObject;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/login")
public class LoginServlet extends HttpServlet {
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    JsonObject jsonResponse = new JsonObject();
    UserService userService = UserServiceFactory.getUserService();

    if (!userService.isUserLoggedIn()) {
      jsonResponse.addProperty("loggedIn", false);
      String loginUrl = userService.createLoginURL("/");
      jsonResponse.addProperty("loginUrl", loginUrl);
    } else {
      jsonResponse.addProperty("loggedIn", true);
      String logoutUrl = userService.createLogoutURL("/");
      jsonResponse.addProperty("logoutUrl", logoutUrl);
      User user = userService.getCurrentUser();
      String userId = user.getUserId();
      jsonResponse.addProperty("userId", userId);
    }

    response.setContentType("application/json;");
    response.getWriter().println(jsonResponse.toString());
  }
}
