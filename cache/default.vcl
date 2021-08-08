vcl 4.1;

import std;
import bodyaccess;

backend default {
    .host = "localhost";
    .port = "8545";
}

sub vcl_recv {
    if (req.http.X-Custom-Method == "eth_blockNumber") {
        return (pass);
    }
    unset req.http.X-Body-Len;
    if (req.method == "POST" && req.url ~ "$") {
        std.cache_req_body(10KB);
        set req.http.X-Body-Len = bodyaccess.len_req_body();
        if (req.http.X-Body-Len == "-1") {
            return(synth(400, "The request body size exceeds the limit"));
        }
        return (hash);
    }
}

sub vcl_hash {
    # To cache POST and PUT requests
    if (req.http.X-Body-Len) {
        bodyaccess.hash_req_body();
    } else {
        hash_data("");
    }
}

sub vcl_backend_fetch {
    if (bereq.http.X-Body-Len) {
        set bereq.method = "POST";
    }
}

sub vcl_backend_response {
    if (beresp.status == 200) {
        //cache eth_syncing for 10 seconds
        if (bereq.http.X-Custom-Method == "eth_syncing") {
            set beresp.ttl = 10s;
            return (deliver);
        }

        //cache eth_chainId for 1 minute
        if (bereq.http.X-Custom-Method == "eth_chainId") {
            set beresp.ttl = 1m;
            return (deliver);
        }
        
        //cache eth_getTransactionReceipt for 1d if valid
        //valid responses > 500 bytes
        //invalid responses < 500 bytes and return a null result buried in json
        if (bereq.http.X-Custom-Method == "eth_getTransactionReceipt") {
            if (std.integer(beresp.http.content-length, 500) < 500) {
                set beresp.ttl = 0s;
                return (deliver);
            }
            set beresp.ttl = 1d;
            return (deliver);
        }

        //cache eth_getBlockByNumber for 7d if valid
        //valid responses > 500 bytes
        //invalid responses < 500 bytes and return a null result buried in json
        if (bereq.http.X-Custom-Method == "eth_getBlockByNumber") {
            if (std.integer(beresp.http.content-length, 500) < 500) {
                set beresp.ttl = 0s;
                return (deliver);
            }
            set beresp.ttl = 7d;
            return (deliver);
        }

        //cache eth_getUncleByBlockNumberAndIndex for 7d if valid
        //valid responses > 500 bytes
        //invalid responses < 500 bytes and return a null result buried in json
        if (bereq.http.X-Custom-Method == "eth_getUncleByBlockNumberAndIndex") {
            if (std.integer(beresp.http.content-length, 500) < 500) {
                set beresp.ttl = 0s;
                return (deliver);
            }
            set beresp.ttl = 7d;
            return (deliver);
        }

        //cache all other calls for 1 minute
        set beresp.ttl = 1m;

        return (deliver);
    }

    return (deliver);
}
