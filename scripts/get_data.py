#!/usr/bin/env python

from __future__ import print_function
import json
import urllib2
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
    "latest_time": "2016-12-01T00:00:00",
    #"latest_time": "now",
    "count": 0,
    "output_mode": "json"
}

#| dedup _time committee_id expenditure_amount toward candidate_id


#| eval use=if((is_notice="false" AND _time<=strptime("2016-10-19", "%F")) OR (is_notice="true" AND _time>strptime("2016-10-19", "%F")), 1, 0) | where use=1

stats_query = """
search index=fec sourcetype=fec_schedule_e candidate=clinton OR candidate=trump toward=*
| stats sum(expenditure_amount) as spent by committee_id committee.committee_type_full committee.name toward candidate candidate_id
| sort 0 -spent
| streamstats count as rank by toward candidate
| eval committee_id=if(rank<=5, committee_id, "none")
| eval committee.name=if(rank<=5, 'committee.name', "others ".toward." ".candidate)
| eval committee.committee_type_full=if(rank<=5, 'committee.committee_type_full', "none")
| stats sum(spent) as spent by committee_id committee.name committee.committee_type_full toward candidate candidate_id
"""

print("Running stats_query...")

stats_result = service.jobs.oneshot(stats_query, **kwargs_oneshot)

print("Done.")

f = open("/data/www/data/schedule_e_stats.json", "w")

print(stats_result, file=f)

timechart_query = """
search index=fec sourcetype=fec_schedule_e candidate=clinton OR candidate=trump toward=*
| eval id=candidate."_".candidate_id."_".toward
| timechart span=1w sum(expenditure_amount) by id
| fillnull
"""

print("Running timechart_query...")

timechart_result = service.jobs.oneshot(timechart_query, **kwargs_oneshot)

print("Done.")

f = open("/data/www/data/schedule_e_timechart.json", "w")

print(timechart_result, file=f)

latest_query = """
search index=fec sourcetype=fec_schedule_e candidate=clinton OR candidate=trump toward=*
| head 1
| table _time
| eval now=now()
"""

print("Running latest_query...")

latest_result = service.jobs.oneshot(latest_query, **kwargs_oneshot)

print("Done.")

f = open("/data/www/data/schedule_e_latest.json", "w")

print(latest_result, file=f)

kwargs_oneshot["earliest_time"] = 0

stats_by_committee_type_query = """
search index=fec sourcetype=fec_schedule_e candidate=clinton OR candidate=trump toward=supporting OR toward=opposing
| rename "committee.committee_type_full" as ct
| eval committee_type=if(match(ct, "Super|Party - Qualified|PAC -|PAC.+Nonqualified"), ct, "OTHER")
| stats sum(expenditure_amount) as spent by committee_type candidate date_year
| lookup presidential_elections.csv date_year
| where match(candidates, candidate)
| stats sum(spent) as spent by committee_type election_year
"""

print("Running timechart_query...")

stats_by_committee_type_result = service.jobs.oneshot(stats_by_committee_type_query, **kwargs_oneshot)

print("Done.")

f = open("/data/www/data/schedule_e_stats_by_committee_type.json", "w")

print(stats_by_committee_type_result, file=f)

attempts = 0

while attempts < 3:
    try:
        print("Getting polling data...")

        response = urllib2.urlopen("http://elections.huffingtonpost.com/pollster/api/charts/2016-general-election-trump-vs-clinton", timeout=5)
        content = response.read()

        f = open("/data/www/data/polls.json", "w")
        f.write(content)
        f.close()
        break
    except urllib2.URLError as e:
        attempts += 1
        print(type(e))

print("Done.")
