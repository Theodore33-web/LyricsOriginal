import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class SpotifyLikeTest {

    // TO-DO : Colle ton token d'accès Spotify actuel ici (sans le mot "Bearer ")
    private static final String ACCESS_TOKEN = "91d4165085fd4ed3bd281f16667d64bc";

    public static void main(String[] args) {
        if (ACCESS_TOKEN.equals("VOTRE_TOKEN_ACCESS_ICI")) {
            System.out.println("❌ Veuillez d'abord insérer un token d'accès Spotify valide.");
            return;
        }

        try {
            System.out.println("🎵 1. Récupération de la musique en cours d'écoute...");
            String trackId = getCurrentlyPlayingTrack();

            if (trackId == null) {
                System.out.println("🛑 Aucune musique en cours d'écoute ou appareil inactif.");
                return;
            }

            System.out.println("\n🔍 2. Vérification de l'état du cœur (titre liké ?)...");
            boolean isLiked = checkIfTrackIsLiked(trackId);
            System.out.println("Résultat : " + (isLiked ? "❤️ Le morceau est déjà liké !" : "🤍 Le morceau n'est pas liké."));

            System.out.println("\n⚡ 3. Inversion de l'état (Action de cliquer sur le cœur)...");
            toggleLikeTrack(trackId, isLiked);

            System.out.println("\n🔄 4. Nouvelle vérification pour confirmer le changement...");
            isLiked = checkIfTrackIsLiked(trackId);
            System.out.println("Nouvel état : " + (isLiked ? "❤️ Ajouté aux favoris !" : "🤍 Supprimé des favoris !"));

        } catch (Exception e) {
            System.err.println("🚨 Une erreur est survenue : " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Récupère la musique actuellement lue et affiche son nom
     * Retourne l'identifiant (ID) du morceau Spotify
     */
    private static String getCurrentlyPlayingTrack() throws Exception {
        URL url = new URL("https://api.spotify.com/v1/me/player/currently-playing");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", "Bearer " + ACCESS_TOKEN);

        int responseCode = conn.getResponseCode();
        if (responseCode == 204) return null; // Rien ne joue

        if (responseCode == 200) {
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String inputLine;
            StringBuilder response = new StringBuilder();
            while ((inputLine = in.readLine()) != null) {
                response.append(inputLine);
            }
            in.close();

            String json = response.toString();
            
            // Extraction basique et minimale sans bibliothèque JSON externe
            String trackName = extractJsonValue(json, "\"name\"");
            String artistName = extractJsonValue(json, "\"name\""); // Simplifié pour le premier trouvé
            String trackId = extractJsonValue(json, "\"id\"");

            System.out.println("👉 Musique détectée : " + trackName);
            return trackId;
        } else {
            throw new RuntimeException("Échec de la requête (Code HTTP: " + responseCode + "). Token expiré ?");
        }
    }

    /**
     * Vérifie si l'ID d'un morceau est présent dans la bibliothèque de l'utilisateur
     */
    private static boolean checkIfTrackIsLiked(String trackId) throws Exception {
        URL url = new URL("https://api.spotify.com/v1/me/tracks/contains?ids=" + trackId);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", "Bearer " + ACCESS_TOKEN);

        if (conn.getResponseCode() == 200) {
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String line = in.readLine();
            in.close();
            // L'API renvoie un tableau de booléens sous la forme [true] ou [false]
            return line != null && line.contains("true");
        }
        return false;
    }

    /**
     * Ajoute (PUT) ou Supprime (DELETE) le morceau des favoris
     */
    private static void toggleLikeTrack(String trackId, boolean isCurrentlyLiked) throws Exception {
        String method = isCurrentlyLiked ? "DELETE" : "PUT";
        URL url = new URL("https://api.spotify.com/v1/me/tracks?ids=" + trackId);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setRequestProperty("Authorization", "Bearer " + ACCESS_TOKEN);
        conn.setRequestProperty("Content-Type", "application/json");
        
        if (method.equals("PUT")) {
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write("{}".getBytes()); // Un body vide ou un objet JSON vide est requis pour le PUT
                os.flush();
            }
        }

        int responseCode = conn.getResponseCode();
        if (responseCode == 200 || responseCode == 201) {
            System.out.println("✅ Requête " + method + " traitée avec succès par Spotify.");
        } else {
            System.out.println("❌ Erreur lors de la modification du favori. Code HTTP : " + responseCode);
        }
    }

    /**
     * Utilitaire de découpage de chaîne de texte minimaliste pour extraire une valeur d'un JSON
     */
    private static String extractJsonValue(String json, String key) {
        try {
            int index = json.indexOf(key);
            if (index == -1) return "Inconnu";
            int valueStart = json.indexOf(":", index) + 1;
            while (json.charAt(valueStart) == ' ' || json.charAt(valueStart) == '"') {
                valueStart++;
            }
            int valueEnd = valueStart;
            char delimiter = json.contains("\"") ? '"' : ',';
            while (json.charAt(valueEnd) != delimiter && json.charAt(valueEnd) != ',' && json.charAt(valueEnd) != '}') {
                valueEnd++;
            }
            return json.substring(valueStart, valueEnd).trim().replace("\"", "");
        } catch (Exception e) {
            return "Inconnu";
        }
    }
}
