\set ON_ERROR_STOP 1

BEGIN;

ALTER TABLE iswc ADD CONSTRAINT iswc_work_fkey FOREIGN KEY (work) REFERENCES work (id);

COMMIT;
