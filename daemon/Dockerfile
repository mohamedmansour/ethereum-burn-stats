FROM golang:1.16 AS builder

COPY . /go/src/github.com/mohamedmansour/ethereum-burn-stats/daemon
WORKDIR /go/src/github.com/mohamedmansour/ethereum-burn-stats/daemon
RUN go build

FROM debian:buster-slim

COPY --from=builder /go/src/github.com/mohamedmansour/ethereum-burn-stats/daemon/daemon daemon

ENTRYPOINT ["/daemon"]
