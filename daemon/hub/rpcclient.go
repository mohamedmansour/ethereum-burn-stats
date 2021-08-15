package hub

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

// RPCClient is a client for the RPC interface
type RPCClient struct {
	endpoint   string
	httpClient HTTPClient
}

// HTTPClient is an interface for making HTTP requests
type HTTPClient interface {
	Do(request *http.Request) (*http.Response, error)
}

// CallContext is a context for a single RPC call
func (c *RPCClient) CallContext(
	version string,
	method string,
	blockNumber string,
	updateCache bool,
	args ...interface{},
) (json.RawMessage, error) {

	requestMethod := "POST"
	requestURL := c.endpoint

	b, err := json.Marshal(args)
	if err != nil {
		return nil, err
	}

	data := jsonrpcMessage{
		Version: version,
		ID:      json.RawMessage("0"),
		Method:  method,
		Params:  json.RawMessage(b),
	}

	b, err = json.Marshal(data)
	if err != nil {
		return nil, err
	}
	requestBody := bytes.NewReader(b)

	// Creating *Request instance based on the above variables
	request, err := http.NewRequest(
		requestMethod,
		requestURL,
		requestBody,
	)
	if err != nil {
		return nil, fmt.Errorf("error while creating http request %s", err)
	}

	request.Header.Add("Content-Type", "application/json")
	//request.Header.Add("Connection", "close")
	request.Header.Add("X-Custom-Method", method)
	if blockNumber != "" {
		request.Header.Add("X-Custom-Block-Number", blockNumber)
	}
	if updateCache {
		request.Header.Add("X-Custom-Update-Cache", "true")
	} else {
		request.Header.Add("X-Custom-Update-Cache", "false")
	}

	//Firing the request and receiving response
	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("error while doing http request %s", err)
	}

	defer response.Body.Close()

	responseBody, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("error while reading http response body %s", err)
	}

	//Unmarshalling json response to the required type
	var message jsonrpcMessage

	err = json.Unmarshal(responseBody, &message)
	if err != nil {
		return nil, fmt.Errorf("error while unmarshalling response body %s '%s'", err, string(responseBody))
	}

	return message.Result, nil
}
