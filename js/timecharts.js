define([
    "jquery",
    "d3",
    "underscore",
    "js/helper"
],
function(
    $,
    d3,
    _,
    helper
) {
    return function(data) {
        var margin = {
                "top": 50,
                "right": 50,
                "bottom": 100,
                "left": 50
            },
            green = data.green,
            red = data.red,
            width = Math.min($("#viz_timecharts").parent().innerWidth(), 1200) - margin.left - margin.right,
            height = width * 0.5 - margin.top - margin.bottom,
            font_size = height * 0.04,
            img_ratio = 190 / 616,
            img_width = height / 2 * img_ratio
            dates = _(data.timechart[0].data).pluck("date"),
            election_date = new Date("2016-11-08"),
            max_spent = helper.round_nearest(data.stats.timechart.max_spent, 1000000, "up"),
            max_poll_range = helper.round_nearest(data.stats.timechart.max_poll_range, 5, "up");

        var svg = d3.select("svg#viz_timecharts")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + [margin.left + img_width, margin.top] + ")");

        var chart_g = svg.selectAll("g")
            .data(data.timechart)
            .enter()
            .append("g")
                .attr("class", function(d) {
                    return d.candidate;
                })
                .attr("transform", function(d, i) {
                    var x = 0;
                    var y = height / 2 * i;

                    return "translate(" + [x, y] + ")";
                });

        var image = chart_g
            .append("image")
                .attr("x", -img_width)
                .attr("y", 0)
                .attr("width", img_width)
                .attr("height", height / 2)
                .attr("xlink:href", function(d) {
                    return "/images/" + d.candidate + "_strip.jpg";
                })
                .on("mouseover", function(d) {
                    helper.tooltip
                        .style("visibility", "visible")
                        .text(d.candidate.capitalize());
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");
                });

        var x = d3.scaleTime()
            .domain([new Date("2015-05-01"), new Date("2016-12-01")])
            .range([0, width - img_width]);

        var y_spent = d3.scaleLinear()
            .domain([max_spent, 0])
            .range([0, height / 2]);

        var y_poll = d3.scaleLinear()
            .range([0, height / 2]);

        var x_axis = svg
            .append("g")
                .attr("class", "axis axis_x")
                .attr("transform", "translate(" + [0, height] + ")")
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.timeMonth.every(1))
                );

        var line = d3.line()
            .x(function(d) {
                return x(d.date);
            });

        // Election Day
        x_axis
            .append("path")
                .attr("d", "M" + x(election_date) + " 0 l0 -" + height)
                .attr("stroke", "orange")
                .attr("stroke-width", 2);

        x_axis.selectAll("text")
            .attr("font-size", font_size)
            .attr("y", 0)
            .attr("x", height * 0.03)
            .attr("transform", "rotate(45)")
            .style("fill", "white")
            .style("text-anchor", "start");

        x_axis
            .append("text")
                .attr("x", x(election_date))
                .attr("y", -height - 10)
                .attr("text-anchor", "middle")
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

        function mouseover() {
            d3.selectAll(".hover")
                .attr("visibility", "visible");
        }

        function mouseout() {
            d3.selectAll(".hover")
                .attr("visibility", "hidden");
        }

        function mousemove() {
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisect_date(dates, x0, 1),
                d0 = dates[i - 1],
                d1 = dates[i],
                date = x0 - d0 > d1 - x0 ? d1 : d0;

            hover_line
                .attr("transform", "translate(" + [x(date), 0] + ")");

            hover_circle
                .attr("visibility", function(d) {
                    var candidate = d3.select(this.parentNode).attr("class"),
                        value = get_data(date, candidate)[d];

                    return value === null ? "hidden" : "visible";
                })
                .attr("transform", function(d) {
                    var candidate = d3.select(this.parentNode).attr("class"),
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
        }

        var hover_circle = chart_g.selectAll("circle.hover")
            .data(function(d) {
                return _(d.data[0]).chain()
                    .keys()
                    .reject(function(v) {
                        return v === "candidate" || v === "date";
                    })
                    .value();
            })
            .enter()
                .append("circle")
                    .attr("class", "hover")
                    .attr("r", 4)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("visibility", "hidden")
                    .style("fill", "none")
                    .style("stroke", "white");

        var hover_line = svg
            .append("path")
                .attr("class", "hover")
                .attr("d", "M0 0 l0 " + height)
                .attr("stroke", "white")
                .attr("visibility", "hidden");

        var hover_rect = svg
            .append("rect")
                .attr("width", width)
                .attr("height", height)
                .style("fill", "none")
                .style("pointer-events", "all")
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
                .on("mousemove", mousemove);
    };
});
