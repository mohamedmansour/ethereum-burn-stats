FROM fedora:34
ENV VARNISH_MODULES=0.17.1
RUN dnf install -y make procps varnish varnish-devel automake libtool python-docutils && dnf clean all
RUN varnish_modules="https://github.com/varnish/varnish-modules/archive/refs/tags/${VARNISH_MODULES}.tar.gz"; \
	curl -sL "${varnish_modules}" | tar xz -C /tmp/; \
	cd /tmp/varnish-modules-*; \
	./bootstrap; \
	./configure; \
	make; \
	make rst-docs; \
	make install; 
COPY ./default.vcl /etc/varnish
ADD ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
