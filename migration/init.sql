create table block_stats (
	number			INTEGER PRIMARY KEY,
	timestamp		INTEGER,
	base_fee		NUMERIC(256),
	burned			NUMERIC(256),
	gas_target		INTEGER,
	gas_used		INTEGER,
	gas_used_percentage	INTEGER,
	priority_fee		NUMERIC(256),
	rewards			NUMERIC(256),
	tips			NUMERIC(256),
	transactions		INTEGER,
	type2_transactions	INTEGER
);

CREATE FUNCTION eth(numeric) RETURNS numeric
    AS 'select $1 / 1000000000000000000;'
    LANGUAGE SQL
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;

CREATE FUNCTION gwei(numeric) RETURNS numeric
    AS 'select $1 / 1000000000;'
    LANGUAGE SQL
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;