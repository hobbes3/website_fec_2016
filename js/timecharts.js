define([
    "jquery",
    "d3",
    "underscore",
    "moment",
    "js/helper"
],
function(
    $,
    d3,
    _,
    moment,
    helper
) {
    return function(data) {
        var margin = {
                "top": 110,
                "right": 150,
                "bottom": 100,
                "left": 50
            },
            green = data.green,
            red = data.red,
            width = Math.min($("#viz_timecharts").parent().innerWidth(), 1200) - margin.left - margin.right,
            height = width * 0.7 - margin.top - margin.bottom,
            chart_height = height * 0.8;
            font_size = height * 0.03,
            img_ratio = 190 / 616,
            img_width = chart_height / 2 * img_ratio,
            dates = _(data.timechart[0].data).pluck("date"),
            earliest = moment.utc("2015-05-01"),
            latest = moment.utc("2016-12-01"),
            election_date = moment.utc("2016-11-08"),
            max_spent = helper.round_nearest(data.stats.timechart.max_spent, 1000000, "up"),
            max_poll_range = helper.round_nearest(data.stats.timechart.max_poll_range, 5, "up"),
            marker_height = chart_height * 0.04,
            marker_width = marker_height * 1.3,
            marker_relax_delta = marker_height * 1.2,
            marker_relax_sleep = 10;

        var timeline_data = [
            {"date": "2015-06-16", "name": "Donald Trump declares for the Republican presidential nomination", "link": null},
            {"date": "2015-08-06", "name": "1st Republican debate", "link": null},
            {"date": "2015-09-16", "name": "2nd Republican debate", "link": null},
            {"date": "2015-10-13", "name": "1st Democratic debate", "link": null},
            {"date": "2015-10-28", "name": "3rd Republican debate", "link": null},
            {"date": "2015-11-10", "name": "4th Republican debate", "link": null},
            {"date": "2015-11-14", "name": "2nd Democratic debate", "link": null},
            {"date": "2015-12-15", "name": "5th Republican debate", "link": null},
            {"date": "2015-12-19", "name": "3rd Democratic debate", "link": null},
            {"date": "2016-01-14", "name": "6th Republican debate", "link": null},
            {"date": "2016-01-17", "name": "4th Democratic debate", "link": null},
            {"date": "2016-01-28", "name": "7th Republican debate", "link": null},
            {"date": "2016-02-04", "name": "5th Democratic debate", "link": null},
            {"date": "2016-02-06", "name": "8th Republican debate", "link": null},
            {"date": "2016-02-11", "name": "6th Democratic debate", "link": null},
            {"date": "2016-02-13", "name": "9th Republican debate", "link": null},
            {"date": "2016-02-20", "name": "Jeb Bush withdraws from Republican presidential nomination", "link": null},
            {"date": "2016-02-25", "name": "10th Republican debate", "link": null},
            {"date": "2016-03-01", "name": "Super Tuesday", "link": "https://en.wikipedia.org/wiki/Super_Tuesday"},
            {"date": "2016-03-03", "name": "11th Republican debate", "link": null},
            {"date": "2016-03-04", "name": "Ben Carson withdraws from Republican presidential nomination", "link": null},
            {"date": "2016-03-06", "name": "7th Democratic debate", "link": null},
            {"date": "2016-03-09", "name": "8th Democratic debate", "link": null},
            {"date": "2016-03-10", "name": "12th and final Republican debate", "link": null},
            {"date": "2016-03-15", "name": "Marco Rubio withdraws from Republican presidential nomination", "link": null},
            {"date": "2016-04-14", "name": "9th and final Democratic debate", "link": null},
            {"date": "2016-05-03", "name": "Ted Cruz withdraws from Republican presidential nomination", "link": null},
            {"date": "2016-05-04", "name": "John Kasich withdraws from Republican presidential nomination", "link": null},
            {"date": "2016-07-12", "name": "Bernie Sanders endorses Hillary Clinton", "link": null},
            {"date": "2016-07-18", "name": "Republican National Convention", "link": "https://en.wikipedia.org/wiki/2016_Republican_National_Convention"},
            {"date": "2016-07-23", "name": "Democratic National Committee email leak", "link": "https://en.wikipedia.org/wiki/2016_Democratic_National_Committee_email_leak"},
            {"date": "2016-07-25", "name": "Democratic National Convention", "link": "https://en.wikipedia.org/wiki/2016_Democratic_National_Convention"},
            {"date": "2016-09-26", "name": "First presidential general election debate", "link": null},
            {"date": "2016-10-04", "name": "Only vice presidential general election debate", "link": null},
            {"date": "2016-10-09", "name": "Second presidential general election debate", "link": null},
            {"date": "2016-10-19", "name": "Third and final presidential general election debate", "link": null}
        ];

        var legend_data = [
            {
                "data": [
                    {
                        "name": "Major event",
                        "type": "marker",
                        "color": "white"
                    },
                    {
                        "name": "Republican debate",
                        "type": "marker",
                        "color": "red"
                    },
                    {
                        "name": "Democratic debate",
                        "type": "marker",
                        "color": "blue"
                    }
                ]
            },
            {
                "data": [
                    {
                        "name": "National poll %",
                        "type": "line",
                        "color": "steelblue"
                    },
                    {
                        "name": "Supporting expenditure $",
                        "type": "line",
                        "color": green
                    },
                    {
                        "name": "Opposing expenditure $",
                        "type": "line",
                        "color": red
                    }
                ]
            }
        ];

        var svg = d3.select("svg#viz_timecharts")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + [margin.left + img_width, margin.top] + ")");

        var img_g = svg.selectAll("g.img")
            .data(data.timechart)
            .enter()
            .append("g")
                .attr("class", function(d) {
                    return d.candidate + " img";
                })
                .attr("transform", function(d, i) {
                    return "translate(" + [-img_width, chart_height / data.timechart.length * i] + ")";
                });

        var image = img_g
            .append("image")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", img_width)
                .attr("height", chart_height / 2)
                .attr("xlink:href", function(d) {
                    return "/images/" + d.candidate + "_strip.jpg";
                })
                .on("mouseover", function(d) {
                    var html = d.candidate.capitalize() + "<br><i>Click for more details</i>";
                    helper.tooltip
                        .style("visibility", "visible")
                        .html(html);
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");
                })
                .on("click", function(d) {
                    var candidate_id = d.candidate_id;

                    window.open("https://beta.fec.gov/data/candidate/" + candidate_id, "_blank");
                });

        var x = d3.scaleTime()
            .domain([earliest, latest])
            .range([0, width - img_width]);

        var y_spent = d3.scaleLinear()
            .domain([max_spent, 0])
            .range([0, chart_height / data.timechart.length]);

        var y_poll = d3.scaleLinear()
            .range([0, chart_height / data.timechart.length]);

        var line = d3.line()
            .x(function(d) {
                return x(d.date);
            });

        var x_axis = svg
            .append("g")
                .attr("class", "axis axis_x")
                .attr("transform", "translate(" + [0, chart_height] + ")")
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.timeMonth.every(1))
                );

        x_axis.selectAll("text")
            .attr("font-size", font_size)
            .attr("y", 0)
            .attr("x", chart_height * 0.03)
            .attr("transform", "rotate(45)")
            .style("fill", "white")
            .style("text-anchor", "start");


        var chart_g = svg.selectAll("g.chart")
            .data(data.timechart)
            .enter()
            .append("g")
                .attr("class", function(d) {
                    return d.candidate + " chart";
                })
                .attr("transform", function(d, i) {
                    return "translate(" + [0, chart_height / data.timechart.length * i] + ")";
                });

        var x_line = chart_g
            .append("path")
                .attr("d", "M0 " + chart_height / data.timechart.length + " l" + (width - img_width) + " 0")
                .style("stroke", "white");

        // Election Day
        svg
            .append("path")
                .attr("class", "election_day")
                .attr("d", "M" + x(election_date) + " 0 l0 " + chart_height)
                .attr("stroke", "orange")
                .attr("stroke-width", 2);

        svg
            .append("text")
                .attr("class", "election_day")
                .attr("text-anchor", "middle")
                .attr("x", 0)
                .attr("y", 0)
                .attr("transform", "translate(" + [x(election_date) * 1.005, chart_height / data.timechart.length] + ")rotate(90)")
                .style("font-size", font_size)
                .style("fill", "orange")
                .text("Election Day, Nov. 8th")

        chart_g
            .append("path")
                .attr("class", "line")
                .attr("d", function(d) {
                    line
                        .y(function(dd) {
                            return y_spent(dd.supporting);
                        });
                    return line(d.data);
                })
                .style("stroke", green);

        chart_g
            .append("path")
                .attr("class", "line")
                .attr("d", function(d) {
                    line
                        .y(function(dd) {
                            return y_spent(dd.opposing);
                        });
                    return line(d.data);
                })
                .style("stroke", red);

        chart_g
            .append("path")
                .attr("class", "line")
                .attr("d", function(d) {
                    var p_min = helper.round_nearest(data.stats.timechart.min_poll[d.candidate], 5, "down");

                    y_poll.domain([p_min + max_poll_range, p_min]);

                    line
                        .y(function(dd) {
                            return y_poll(dd.poll);
                        })
                        .defined(function(dd) {
                            return dd.poll;
                        });

                    return line(d.data);
                })
                .style("stroke", "steelblue");

        var timeline = svg
            .append("g")
                .attr("class", "timeline");

        timeline
            .append("path")
                .attr("d", "M0 0 l" + (width - img_width) + " 0")
                .style("stroke", "white");

        var timeline_hover_line = timeline
            .append("path")
                .attr("d", "M0 0 l0 " + chart_height)
                .style("stroke", "white")
                .style("visibility", "hidden");

        var timeline_event = timeline.selectAll("g.marker")
            .data(timeline_data)
            .enter()
            .append("g")
                .attr("class", "marker")
                .attr("transform", function(d) {
                    return "translate(" + [x(moment.utc(d.date)), -chart_height * 0.01] + ")";
                });

        var marker_d = function() {
            var w = marker_width,
                h = marker_height,
                path = d3.path();

            path.moveTo(0, 0);
            path.quadraticCurveTo(w / 2, 0, w / 2, -h);
            path.lineTo(-w / 2, -h);
            path.moveTo(0, 0);
            path.quadraticCurveTo(-w / 2, 0, -w / 2, -h);

            return path.toString();
        }

        var timeline_marker = timeline_event
            .append("path")
                .attr("class", "marker")
                .attr("d", marker_d)
                .attr("transform", "translate(0,0)")
                .style("fill", function(d) {
                    if(d.name.indexOf("debate") > -1) {
                        if(d.name.indexOf("Republican") > -1) {
                            return "red";
                        }
                        else if(d.name.indexOf("Democratic") > -1) {
                            return "blue";
                        }
                    }

                    return "white";
                })
                .style("opacity", 0.8)
                .on("mouseover", function(d) {
                    timeline_marker
                        .filter(function(dd) {
                            return dd !== d;
                        })
                        .transition()
                        .style("opacity", 0.2);

                    timeline_hover_line
                        .transition()
                        .attr("transform", "translate(" + [x(moment.utc(d.date)), 0] + ")")
                        .style("opacity", 0.8)
                        .style("visibility", "visible")

                    helper.tooltip
                        .style("visibility", "visible")
                        .html(moment.utc(d.date).format("MMMM Do YYYY") + "<br>" + d.name);
                })
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");

                    timeline.selectAll("path")
                        .transition()
                        .style("opacity", 0.8);
                })
                .on("mousemove", helper.tooltip_position);

        function marker_relax() {
            var adjusted = false;

            timeline_marker
                .each(function() {
                    var a = this;

                    timeline_marker
                        .each(function() {
                            var b = this;
                                da = d3.select(a),
                                db = d3.select(b);

                            if(a === b) return;

                            var ra = a.getBoundingClientRect(),
                                rb = b.getBoundingClientRect();

                            var overlap = ra.top < rb.bottom &&
                                          rb.top < ra.bottom &&
                                          ra.left < rb.right &&
                                          rb.left < ra.right;

                            if(!overlap) return;

                            adjusted = true;

                            var yb = helper.get_translate(db.attr("transform"))[1];

                            db.attr("transform", "translate(" + [0, yb - marker_relax_delta] + ")");
                        });
                });

            if(adjusted) {
                setTimeout(marker_relax, marker_relax_sleep)
            }
        }

        marker_relax();

        var bisect_date = d3.bisector(function(d) {
            return d;
        }).left;

        function get_data(date, candidate) {
            return _(_(data.timechart)
                .findWhere({"candidate": candidate})
                .data)
                .find(function(v) {
                    return +v.date === +date
                });
        }


        function get_color(d) {
            switch(d) {
                case "supporting": return green;
                case "opposing": return red;
                case "poll": return "steelblue";
            }
        }

        var hover = svg
            .append("g")
                .attr("class", "hover");

        var hover_g = chart_g
            .append("g")
                .attr("class", function(d) {
                    return d.candidate + " hover";
                });

        var hover_data = hover_g.selectAll()
            .data(function(d) {
                return _(d.data[0]).chain()
                    .keys()
                    .reject(function(v) {
                        return v === "candidate" || v === "date" || v === "candidate_id";
                    })
                    .reverse()
                    .value();
            })
            .enter();

        var hover_circle = hover_data
            .append("circle")
                .attr("class", "hover")
                .attr("visibility", "hidden")
                .attr("r", chart_height * 0.02)
                .attr("x", 0)
                .attr("y", 0)
                .attr("stroke-width", chart_height * 0.008)
                .attr("fill", "none");

        var hover_text = hover_data
            .append("text")
                .attr("class", "hover")
                .attr("alignment-baseline", "middle")
                .attr("visibility", "hidden")
                .style("font-size", font_size);

        var hover_text_line = hover_data
            .append("path")
                .attr("class", "hover")
                .attr("stroke-width", chart_height * 0.008)
                .attr("stroke-linecap", "round")
                .attr("visibility", "hidden");

        var hover_line = hover
            .append("path")
                .attr("class", "hover")
                .attr("visibility", "hidden")
                .attr("d", "M0 0 l0 " + chart_height)
                .attr("stroke", "white");

        var hover_date = hover
            .append("text")
                .attr("class", "hover")
                .attr("visibility", "hidden")
                .attr("x", 0)
                .attr("y", -font_size * 1.6)
                .attr("text-anchor", "middle")
                .style("font-size", font_size)
                .style("fill", "white");

        var hover_poll = hover
            .append("text")
                .attr("class", "hover")
                .attr("visibility", "hidden")
                .attr("x", 0)
                .attr("y", -font_size * 0.5)
                .attr("text-anchor", "middle")
                .style("font-size", font_size)
                .style("fill", "steelblue");

        var hover_rect = svg
            .append("rect")
                .attr("width", width - img_width)
                .attr("height", chart_height)
                .style("fill", "none")
                .style("pointer-events", "all")
                .on("mouseover", function() {
                    d3.selectAll(".hover")
                        .attr("visibility", "visible");

                    chart_g.selectAll("path.line")
                        .transition()
                        .style("opacity", 0.4);

                    svg.selectAll(".election_day")
                        .transition()
                        .style("opacity", 0.4);

                    timeline_event
                        .transition()
                        .style("opacity", 0.2);
                })
                .on("mouseout", function() {
                    d3.selectAll(".hover")
                        .attr("visibility", "hidden");

                    chart_g.selectAll("path")
                        .transition()
                        .style("opacity", 1.0);

                    svg.selectAll(".election_day")
                        .transition()
                        .style("opacity", 1.0);

                    timeline_event
                        .transition()
                        .style("opacity", 0.8);
                })
                .on("mousemove", function() {
                    var x0 = x.invert(d3.mouse(this)[0]),
                        n = bisect_date(dates, x0, 1),
                        d0 = dates[n - 1],
                        d1 = dates[n],
                        date = x0 - d0 > d1 - x0 ? d1 : d0,
                        index = _(dates).findIndex(function(v) {
                            return +v === +date;
                        });

                    hover.attr("transform", "translate(" + [x(date), 0] + ")");

                    var hover_date_text = moment.utc(date).format("MMMM Do") + " - " + moment.utc(date).add(6, "days").format("MMMM Do YYYY");

                    hover_date.text(hover_date_text);
                    hover_poll.text(function() {
                        var c = get_data(date, "clinton").poll,
                            t = get_data(date, "trump").poll,
                            clinton = Math.round(c),
                            trump = Math.round(t),
                            label = "Poll spread: ";

                        if(clinton > trump) {
                            label += "Clinton +" + (clinton - trump);
                        }
                        else if(trump > clinton) {
                            label += "Trump +" + (trump - clinton);
                        }
                        else if(trump === clinton && c !== null && t !== null) {
                            label += "Tie!";
                        }
                        else {
                            label += "N/A";
                        }

                        return label;
                    });

                    hover_circle
                        .attr("visibility", function(d) {
                            var candidate = d3.select(this.parentNode).attr("class").split(" ")[0],
                                value = get_data(date, candidate)[d];

                            return value === null ? "hidden" : "visible";
                        })
                        .attr("stroke", get_color)
                        .attr("transform", function(d) {
                            var candidate = d3.select(this.parentNode).attr("class").split(" ")[0],
                                value = get_data(date, candidate)[d],
                                p_min = helper.round_nearest(data.stats.timechart.min_poll[candidate], 5, "down");

                            y_poll.domain([p_min + max_poll_range, p_min]);

                            if(d === "poll") {
                                return "translate(" + [x(date), y_poll(value)] + ")";
                            }
                            else {
                                return "translate(" + [x(date), y_spent(value)] + ")";
                            }
                        });

                    hover_text
                        .attr("x", index < dates.length * 0.5 ? width * 0.03 : -width * 0.03)
                        .attr("y", function(d, i) {
                            return (i + 1) * chart_height / 8;
                        })
                        .attr("text-anchor", index < dates.length * 0.5 ? "start" : "end")
                        .attr("transform", "translate(" + [x(date), 0] + ")")
                        .style("fill", get_color)
                        .text(function(d) {
                            var candidate = d3.select(this.parentNode).attr("class").split(" ")[0],
                                value = get_data(date, candidate)[d],
                                dd = _(data.timechart).findWhere({"candidate": candidate}).data.slice(0, index + 1)
                                sum = _(dd).reduce(function(memo, v) {
                                    return memo + v[d];
                                }, 0);

                            if(d === "poll") {
                                return value === null ? "No poll data" : "Poll " + value + "%";
                            }
                            else {
                                return "$" + helper.dollar_format(value) + " (running total of $" + helper.dollar_format(sum) + ")";
                            }
                        });

                    hover_text_line
                        .attr("visibility", function(d) {
                            var candidate = d3.select(this.parentNode).attr("class").split(" ")[0],
                                value = get_data(date, candidate)[d];

                            return value === null ? "hidden" : "visible";
                        })
                        .attr("d", function(d, i) {
                            var candidate = d3.select(this.parentNode).attr("class").split(" ")[0],
                                value = get_data(date, candidate)[d],
                                p_min = helper.round_nearest(data.stats.timechart.min_poll[candidate], 5, "down"),
                                x_offset = index < dates.length * 0.5 ? width * 0.025 : -width * 0.025;

                            y_poll.domain([p_min + max_poll_range, p_min]);

                            var x0 = x(date),
                                y0 = d === "poll" ? y_poll(value) : y_spent(value),
                                x1 = x(date) + x_offset,
                                y1 = (i + 1) * chart_height / 8,
                                t = Math.atan2(y1 - y0, x1 - x0),
                                degree = t * 180 / Math.PI,
                                r = chart_height * 0.02;

                            return "M" + (x0 + r * Math.cos(t)) + " " + (y0 + r * Math.sin(t)) + " L" + x1 + " " + y1;
                        })
                        .attr("stroke", get_color);
                });

        var legend_g = svg
            .append("g")
                .attr("class", "legend")
                .attr("transform", "translate(" + [0, chart_height] + ")");

        var legend_sub = legend_g.selectAll("g.sub")
            .data(legend_data)
            .enter()
            .append("g")
                .attr("class", "sub")
                .attr("transform", function(d, i) {
                    return "translate(" + [width / legend_data.length * i + width * 0.1, height * 0.2] + ")";
                });

        var legend_label_g = legend_sub.selectAll("g.legend_label")
            .data(function(d) {
                return d.data;
            })
            .enter()
            .append("g")
                .attr("class", "legend_label")
                .attr("transform", function(d, i) {
                    return "translate(" + [0, font_size * 1.5 * i] + ")";
                });

        legend_label_g
            .append("path")
                .attr("class", function(d) {
                    return d.type;
                })
                .attr("d", function(d) {
                    if(d.type === "marker") {
                        return marker_d();
                    }
                    else {
                        return "M0 0 l-30 0";
                    }
                })
                .attr("stroke", function(d) {
                    return d.color;
                })
                .attr("fill", function(d) {
                    return d.color;
                })
                .attr("transform", function(d) {
                    if(d.type === "marker") {
                        return "translate(" + [-font_size * 0.9, font_size * 0.15] + ")";
                    }
                    else {
                        return "translate(" + [-font_size * 0.3, -font_size * 0.3] + ")";
                    }
                });

        legend_label_g
            .append("text")
                .style("font-size", font_size)
                .style("fill", "white")
                .text(function(d) {
                    return d.name;
                });

    };
});
