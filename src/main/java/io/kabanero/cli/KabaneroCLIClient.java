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
package io.kabanero.cli;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.message.BasicHeader;

import io.website.APIClient;

public class KabaneroCLIClient {
    private final static Logger LOGGER = Logger.getLogger(KabaneroCLIClient.class.getName());
    private final String VERSION = "v1";
    private String cliBaseURL;
    private String username;
    private String authToken;

    public KabaneroCLIClient(String cliBaseURL, String username, String authToken) {
        this.cliBaseURL = cliBaseURL;
        this.username = username;
        this.authToken = authToken;
    }

    public String login() {
        String url = this.cliBaseURL + "/login";
        Header contentType = new BasicHeader(HttpHeaders.CONTENT_TYPE, "application/json");

        Map<String, String> body = new HashMap<String, String>();
        body.put("gituser", this.username);
        body.put("gitpat", this.authToken);
        
        return APIClient.post(url, new Header[] { contentType }, body);
    }

    public String listCollections(){
        return "";
    }

    public static void main(String[] args) {
        KabaneroCLIClient c = new KabaneroCLIClient("", "", "" );
        System.out.println(c.login());
    }
    
}