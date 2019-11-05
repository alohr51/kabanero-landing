/******************************************************************************
 *
 * Copyright 2019 IBM Corporation and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 ******************************************************************************/
package io.website;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.net.ssl.SSLContext;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.util.EntityUtils;

public class APIClient {
    private final static Logger LOGGER = Logger.getLogger(APIClient.class.getName());

    public static String get(String url) throws ClientProtocolException, IOException {
        CloseableHttpClient httpclient = HttpClients.createDefault();
        HttpGet httpget = new HttpGet(url);
        CloseableHttpResponse response = httpclient.execute(httpget);

        try {
            HttpEntity entity1 = response.getEntity();

            String resBody = EntityUtils.toString(entity1);
            EntityUtils.consume(entity1);
            return resBody;
        } finally {
            response.close();
        }
    }

    public static String post(String url, Header[] headers, Map<String, String> body) {
        CloseableHttpClient httpClient = getCustomHttpClient();

        if (httpClient == null){
            httpClient = HttpClients.createDefault();
        }

        HttpPost post = new HttpPost(url);
        post.setHeaders(headers);

        try {
            post.setEntity(new StringEntity(new ObjectMapper().writeValueAsString(body)));

            CloseableHttpResponse response = httpClient.execute(post);

            try {
                HttpEntity entity1 = response.getEntity();
                String resBody = EntityUtils.toString(entity1);
                EntityUtils.consume(entity1);
                return resBody;
            } finally {
                response.close();
            }
        } catch (UnsupportedEncodingException e) {
            LOGGER.log(Level.SEVERE, "Post failed encoding exception", e);
            return null;
        } catch (JsonProcessingException e) {
            LOGGER.log(Level.SEVERE, "Post failed to set json body", e);
            return null;
        } catch (IOException e) {
            LOGGER.log(Level.SEVERE, "Post failed", e);
            return null;
        }
    }

    private static CloseableHttpClient getInsecureHttpClient() {
        try {
            SSLContext sslContext = new SSLContextBuilder().loadTrustMaterial(null, TrustSelfSignedStrategy.INSTANCE).build();
            SSLConnectionSocketFactory sslSocketFactory = new SSLConnectionSocketFactory(sslContext, NoopHostnameVerifier.INSTANCE);
            return HttpClients.custom().setSSLSocketFactory(sslSocketFactory).build();
        }
        catch (KeyManagementException |  KeyStoreException | NoSuchAlgorithmException e){
            LOGGER.log(Level.SEVERE, "Failed to init http client", e);
            return null;
        }
    }
    
    
}