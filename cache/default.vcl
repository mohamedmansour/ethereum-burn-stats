vcl 4.1;

import std;
import bodyaccess;

backend default {
    .host = "localhost";
    .port = "8545";
}

sub vcl_recv {
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
        if (bereq.http.X-Custom-Method == "eth_blockNumber") {
            set beresp.ttl = 1s;
        } else if (bereq.http.X-Custom-Method == "eth_gasPrice") {
            set beresp.ttl = 1s;
        } else if (bereq.http.X-Custom-Method == "eth_chainId") {
            set beresp.ttl = 1m;
        } else if (bereq.http.X-Custom-Method == "eth_syncing") {
            set beresp.ttl = 1m;
        } else { 
            set beresp.ttl = 1d;
        }
    }
    return (deliver);
}
