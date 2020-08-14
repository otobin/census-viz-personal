import static com.googlecode.objectify.ObjectifyService.ofy;
import com.google.gson.JsonObject;
import com.google.gson.Gson;
import com.google.sps.data.CensusData;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.List;

@WebServlet("/history")
public class HistoryServlet extends HttpServlet {

    @Override 
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        List<CensusData> history = ofy().load().type(CensusData.class).list();
        String json = new Gson().toJson(history);
        response.getWriter().write(json);
    }
}
