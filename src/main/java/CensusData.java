import com.googlecode.objectify.annotation.Cache;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;
import com.googlecode.objectify.annotation.Index;

@Entity
@Cache
public class CensusData {
    @Id String id;
    @Index String data;

    public CensusData(String id, String data) {
        this.id = queryId;
        this.data = data;
    }
}
