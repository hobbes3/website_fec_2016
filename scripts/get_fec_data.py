#!/usr/bin/env python

from __future__ import print_function
import json
import splunklib.results as results
import splunklib.client as client

with open("/data/www/scripts/config.json") as data_file:
    config = json.load(data_file)

# Create a Service instance and log in
service = client.connect(
    host=config["host"],
    port=config["port"],
    username=config["username"],
    password=config["password"]
)

kwargs_oneshot = {
    "earliest_time": "2015-05-01T00:00:00",
    "latest_time": "now",
    "count": 0,
    "output_mode": "json"
}

stats_query = """
search index=fec sourcetype=fec_schedule_e committee_id=* | rex field=source "(?<candidate>\w+)_schedule" | stats sum(expenditure_amount) as spent by committee_id committee.name support_oppose_indicator candidate | eval spent=round(spent) | eval toward=if(support_oppose_indicator="O", "opposing", "supporting") | sort 0 -spent | streamstats count as rank by toward candidate  | eval id=if(rank<=5, 'committee.name', "others ".toward." ".candidate) | stats sum(spent) as spent by id toward candidate | rename id as committee.name
"""

stats_result = service.jobs.oneshot(stats_query, **kwargs_oneshot)

f = open("/data/www/data/schedule_e_stats.json", "w")

print(stats_result, file=f)

timechart_query = """
search index=fec sourcetype=fec_schedule_e committee_id=* | eval spent=round(expenditure_amount) | rex field=source "(?<candidate>\w+)_schedule" | eval toward=if(support_oppose_indicator="O", "opposing", "supporting") | eval id=candidate.":".toward | timechart span=1w sum(spent) by id | fillnull
"""

timechart_result = service.jobs.oneshot(timechart_query, **kwargs_oneshot)

f = open("/data/www/data/schedule_e_timechart.json", "w")

print(timechart_result, file=f)

latest_query = """
search index=fec sourcetype=fec_schedule_e committee_id=* | head 1 | table _time | eval now=now()
"""

latest_result = service.jobs.oneshot(latest_query, **kwargs_oneshot)

f = open("/data/www/data/schedule_e_latest.json", "w")

print(latest_result, file=f)
