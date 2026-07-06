import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.awt.Desktop;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class SpotifyLikeAuthTest {

    // TO-DO : Remplace par les identifiants de ton application Spotify Dashboard
    private static final String CLIENT_ID = "91d4165085fd4ed3bd281f16667d64bc";
    private static final String REDIRECT_URI = "http://localhost:8080/callback";
    private static final int PORT = 8080;

    private static String accessToken = "";
    private static HttpServer server;

    public static void main(String[] args) {
        try {
            // 1. Démarrer un serveur HTTP local temporaire pour intercepter le code de connexion
            startLocalServer();

            // 2. Ouvrir le navigateur pour se connecter à Spotify
            openSpotifyLoginWindow();

            System.out.println("⏳ En attente de ta connexion dans le navigateur...");
            
            // Boucle d'attente jusqu'à obtention du token
            while (accessToken.isEmpty()) {
                Thread.sleep(500);
            }

            // Arrêt du serveur de connexion devenu inutile
            server.stop(0);
            System.out.println("\n✅ Connexion réussie ! Token récupéré.");

            // 3. Lancement du test du bouton Cœur
            System.out.println("\n🎵 1. Récupération de la musique en cours d'écoute...");
            String trackId = getCurrentlyPlayingTrack();

            if (trackId == null) {
                System.out.println("🛑 Aucune musique en cours d'écoute. Lance un morceau sur Spotify !");
                return;
            }

            System.out.println("\n🔍 2. Vérification de l'état actuel du morceau (liké ?)...");
            boolean isLiked = checkIfTrackIsLiked(trackId);
            System.out.println("Résultat : " + (isLiked ? "❤️ Déjà dans tes favoris !" : "🤍 Pas encore liké."));

            System.out.println("\n⚡ 3. Simulation du clic sur le cœur (Inversion de l'état)...");
            toggleLikeTrack(trackId, isLiked);

            System.out.println("\n🔄 4. Vérification finale...");
            isLiked = checkIfTrackIsLiked(trackId);
            System.out.println("Nouvel état sur ton compte Spotify : " + (isLiked ? "❤️ Ajouté !" : "🤍 Supprimé !"));

        } catch (Exception e) {
            System.err.println("🚨 Erreur : " + e.getMessage());
            e.printStackTrace();
        }
    }

    // --- ENVOI VERS LE NAVIGATEUR POUR CONNEXION ---
    private static void openSpotifyLoginWindow() throws Exception {
        String scopes = "user-read-currently-playing user-library-read user-library-modify";
        String authUrl = "https://accounts.spotify.com/authorize"
                + "?response_type=code"
                + "&client_id=" + CLIENT_ID
                + "&scope=" + URLEncoder.encode(scopes, StandardCharsets.UTF_8.name())
                + "&redirect_uri=" + URLEncoder.encode(REDIRECT_URI, StandardCharsets.UTF_8.name());

        System.out.println("🌍 Ouverture de la page de connexion Spotify...");
        if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
            Desktop.getDesktop().browse(new URI(authUrl));
        } else {
            System.out.println("👉 Copie et colle ce lien dans ton navigateur s'il ne s'ouvre pas automatiquement :\n" + authUrl);
        }
    }

    // --- MINI SERVEUR WEB LOCAL (INTERCEPTION DU CODE CORRECTION LIKÉ) ---
    private static void startLocalServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/callback", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                String query = exchange.getRequestURI().getQuery();
                String code = "";
                if (query != null && query.contains("code=")) {
                    code = query.split("code=")[1].split("&")[0];
                }

                String responseText = "<h1>Connexion reussie !</h1><p>Tu peux fermer cette page et retourner sur ta console Java.</p>";
                exchange.sendResponseHeaders(200, responseText.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseText.getBytes());
                }

                if (!code.isEmpty()) {
                    try {
                        // Échange du code temporaire contre le Token définitif
                        accessToken = exchangeCodeForToken(code);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        });
        server.start();
    }

    // --- ÉCHANGE DU CODE CONTRE LE TOKEN SÉCURISÉ ---
    private static String exchangeCodeForToken(String code) throws Exception {
        URL url = new URL("https://accounts.spotify.com/api/token");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        conn.setDoOutput(true);

        String data = "grant_type=authorization_code"
                + "&code=" + code
                + "&redirect_uri=" + URLEncoder.encode(REDIRECT_URI, StandardCharsets.UTF_8.name())
                + "&client_id=" + CLIENT_ID;

        // Note : Si ton application requiert un Client Secret, tu peux ajouter le header d'Authorization Basic,
        // mais pour ce flux minimaliste avec Client ID seul, cela suffit si l'app est configurée ainsi.
        try (OutputStream os = conn.getOutputStream()) {
            os.write(data.getBytes(StandardCharsets.UTF_8));
        }

        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        StringBuilder res = new StringBuilder();
        String line;
        while ((line = in.readLine()) != null) res.append(line);
        in.close();

        return extractJsonValue(res.toString(), "\"access_token\"");
    }

    // --- LOGIQUE CORE : LIRE LA MUSIQUE EN COURS ---
    private static String getCurrentlyPlayingTrack() throws Exception {
        URL url = new URL("https://api.spotify.com/v1/me/player/currently-playing");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", "Bearer " + accessToken);

        int code = conn.getResponseCode();
        if (code == 204) return null;

        if (code == 200) {
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder res = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) res.append(line);
            in.close();

            String json = res.toString();
            System.out.println("👉 Musique actuelle : " + extractJsonValue(json, "\"name\""));
            return extractJsonValue(json, "\"id\"");
        }
        return null;
    }

    // --- LOGIQUE CORE : VÉRIFIER LE LIKE (CŒUR) ---
    private static boolean checkIfTrackIsLiked(String trackId) throws Exception {
        URL url = new URL("https://api.spotify.com/v1/me/tracks/contains?ids=" + trackId);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", "Bearer " + accessToken);

        if (conn.getResponseCode() == 200) {
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String line = in.readLine();
            in.close();
            return line != null && line.contains("true");
        }
        return false;
    }

    // --- LOGIQUE CORE : CASSER OU METTRE LE COEUR (PUT / DELETE) ---
    private static void toggleLikeTrack(String trackId, boolean isCurrentlyLiked) throws Exception {
        String method = isCurrentlyLiked ? "DELETE" : "PUT";
        URL url = new URL("https://api.spotify.com/v1/me/tracks?ids=" + trackId);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setRequestProperty("Authorization", "Bearer " + accessToken);
        conn.setRequestProperty("Content-Type", "application/json");

        if (method.equals("PUT")) {
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write("{}".getBytes());
                os.flush();
            }
        }

        int code = conn.getResponseCode();
        if (code == 200 || code == 201) {
            System.out.println("✅ Action (" + method + ") appliquee avec succes sur ton compte Spotify !");
        } else {
            System.out.println("❌ Échec de la modification. Erreur HTTP : " + code);
        }
    }

    // --- EXTRACTION PARSEUR MINI-JSON ---
    private static String extractJsonValue(String json, String key) {
        try {
            int index = json.indexOf(key);
            if (index == -1) return "Inconnu";
            int valueStart = json.indexOf(":", index) + 1;
            while (json.charAt(valueStart) == ' ' || json.charAt(valueStart) == '"') valueStart++;
            int valueEnd = valueStart;
            while (json.charAt(valueEnd) != '"' && json.charAt(valueEnd) != ',' && json.charAt(valueEnd) != ']' && json.charAt(valueEnd) != '}') valueEnd++;
            return json.substring(valueStart, valueEnd).trim();
        } catch (Exception e) {
            return "Inconnu";
        }
    }
}
