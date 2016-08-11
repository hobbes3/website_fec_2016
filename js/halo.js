require([
    "d3",
    "underscore"
],
function(
    d3,
    _
) {
    var margin = {
            "top": 80,
            "right": 10,
            "bottom": 80,
            "left": 10
        },
        label_spacing = 5,
        label_wrap_length = 200,
        width = 1300 - margin.left - margin.right,
        height = 1000 - margin.top - margin.bottom,
        transition_duration = 750;
        radius = Math.min(width, height) / 2,
        radius_label = radius + 20,
        thickness = 50,
        length_inner = 2 * Math.sqrt(Math.pow(radius, 2) / 2);

    var svg = d3.select("body")
        .append("svg")
            .attr({
                "width": width + margin.left + margin.right,
                "height": height + margin.top + margin.bottom
            })
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .append("g")
            .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

    d3.json("/data/schedule_e.json", function(json) {
        var data = {};

        data.outer = _(json.results).map(function(v) {
            v.spent = parseInt(v.spent);

            return v;
        });

        data.inner = _(data.outer).chain()
            .groupBy("candidate")
            .map(function(v, k) {
                return {
                    "name": k,
                    "data": v
                };
            })
            .value();

        var outer = svg
            .append("g")
                .attr("class", "outer");

        var color_outer = d3.scale.category20b();

        var arc_outer = d3.svg.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius);

        var pie_outer = d3.layout.pie()
            .value(function(d) {
                return d.spent;
            })
            .sort(null);

        var path_outer = outer.selectAll("g.arc_outer")
            .data(pie_outer(data.outer))
            .enter()
            .append("g")
                .attr("class", "arc_outer")
                .on("mouseover", function(d, i) {
                    outer.selectAll("g.arc_outer")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("g.arc_inner")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("image")
                        .filter(function(dd) {
                            return d.data.candidate !== dd.name;
                        })
                        .transition()
                        .style("opacity", 0.1);
                })
                .on("mouseout", function(d) {
                    outer.selectAll("g.arc_outer")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("g.arc_inner")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("image")
                        .transition()
                        .style("opacity", 1.0);
                })
            .append("path")
                .attr("d", arc_outer)
                .attr("fill", function(d, i) {
                    return color_outer(d.data["committee.name"]);
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_outer = outer.selectAll("g.arc_outer")
            .append("g")
                .attr({
                    "class": "label",
                    "visibility": "visible"
                });

        var label_circle = label_outer
            .append("circle")
                .attr({
                    "x": 0,
                    "y": 0,
                    "r": 2,
                    "transform": function (d, i) {
                        return "translate(" + arc_outer.centroid(d) + ")";
                    },
                    "class": "label-circle"
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_line = label_outer
            .append("line")
                .attr({
                    "x1": function (d) {
                        return arc_outer.centroid(d)[0];
                    },
                    "y1": function (d) {
                        return arc_outer.centroid(d)[1];
                    },
                    "x2": function (d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            x = Math.cos(mid_angle) * radius_label;
                        return x;
                    },
                    "y2": function (d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            y = Math.sin(mid_angle) * radius_label;
                        return y;
                    },
                    "class": "label-line"
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_text_g = label_outer
            .append("g")
                .attr({
                    "class": "label-text-group",
                    "transform": function(d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            x = Math.cos(mid_angle) * radius_label,
                            sign = (x > 0) ? 1 : -1,
                            label_x = x + (2 * sign),
                            label_y = Math.sin(mid_angle) * radius_label;
                        return "translate(" + label_x + "," + label_y + ")";
                    }
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_text = label_text_g
            .append("text")
                .attr({
                    "x": 0,
                    "y": 0,
                    "dy": "0em",
                    "text-anchor": function (d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            x = Math.cos(mid_angle) * radius_label;
                        return (x > 0) ? "start" : "end";
                    },
                    "dominant-baseline": "middle",
                    "class": "label-text"
                })
                .text(function (d) {
                    return d.data["committee.name"];
                })
                .each(function(d) {
                    this._current = d;
                });

        label_text.call(label_wrap, label_wrap_length);
        label_relax();

        function label_wrap(text, width) {
            text.each(function() {
                var text = d3.select(this),
                    g = d3.select(this.parentNode),
                    words = text.text().split(/\s+/).reverse(),
                    word,
                    wrapped = false,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.1, // ems
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null)
                        .append("tspan")
                            .attr({
                                "x": 0,
                                "y": 0,
                                "dy": dy + "em"
                            });
                while(word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if(tspan.node().getComputedTextLength() > width) {
                        wrapped = true;
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text
                            .append("tspan")
                                .attr({
                                    "x": 0,
                                    "y": 0,
                                    "dy": ++lineNumber * lineHeight + dy + "em"
                                })
                                .text(word);

                    }
                }
            });
        }

        function label_relax() {
            var adjusted = false;
            label_text_g
                .filter(function(d) {
                    return d3.select(this.parentNode).attr("visibility") !== "hidden";
                })
                .each(function(d) {
                    var a = this;

                    label_text_g
                        .filter(function(d) {
                            return d3.select(this.parentNode).attr("visibility") !== "hidden";
                        })
                        .each(function (d) {
                            var b = this,
                                da = d3.select(a),
                                db = d3.select(b),
                                ta = da.select("text").attr("text-anchor"),
                                tb = db.select("text").attr("text-anchor");

                            if(a === b || ta !== tb) return;

                            var ra = a.getBoundingClientRect(),
                                rb = b.getBoundingClientRect();

                            var overlap = ra.top - label_spacing < rb.bottom &&
                                          rb.top - label_spacing < ra.bottom;

                            if(!overlap) return;

                            adjusted = true;

                            var xa = d3.transform(da.attr("transform")).translate[0],
                                ya = d3.transform(da.attr("transform")).translate[1],
                                xb = d3.transform(db.attr("transform")).translate[0],
                                yb = d3.transform(db.attr("transform")).translate[1],
                                aa = da.datum().endAngle,
                                ab = db.datum().endAngle;

                                adjust = ta === "start" && aa > ab || ta === "end" && aa < ab ? 1 : -1;

                            da.attr("transform", "translate(" + xa + "," + (ya + adjust) + ")");
                            db.attr("transform", "translate(" + xb + "," + (yb - adjust) + ")");
                        });
                });

            if(adjusted) {
                label_line.attr("y2", function(d, i) {
                    var label_for_line = d3.select(label_text[0][i].parentNode),
                        y = d3.transform(label_for_line.attr("transform")).translate[1];
                    return y;
                });

                setTimeout(label_relax, 20)
            }
        }

        var inner = svg
            .append("g")
                .attr({
                    "class": "inner",
                    "transform": "translate(" + -(length_inner / 2) + "," + -(length_inner / 2) + ")"
                });

        var bubble_inner = d3.layout.pack()
            .value(function(d) {
                return _(d.data).chain()
                    .pluck("spent")
                    .reduce(function(memo, num) {
                        return memo + num;
                    }, 0)
                    .value();
            })
            .sort(null)
            .size([length_inner, length_inner])
            .padding(10);

        var node_inner = inner.selectAll("g.node_inner")
            .data(
                bubble_inner.nodes({ children: data.inner })
                    .filter(function(d) {
                        return !d.children;
                    })
            )
            .enter()
            .append("g")
                .attr({
                    "class": function(d) {
                        return "node_inner " + d.name;
                    },
                    "transform": function(d) {
                        return "translate(" + d.x + "," + d.y + ")";
                    }
                });

        var arc_inner = d3.svg.arc();

        var pie_inner = d3.layout.pie()
            .value(function(d) {
                return d.spent;
            })
            .sort(null);

        var path_inner = node_inner.selectAll("g.arc_inner")
            .data(function(d) {
                return pie_inner(d.data).map(function(m) {
                    m.r = d.r;
                    return m;
                });
            })
            .enter()
            .append("g")
                .attr("class", "arc_inner")
                .on("mouseover", function(d, i) {
                    inner.selectAll("g.arc_inner")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    outer.selectAll("g.arc_outer")
                        .filter(function(dd) {
                            return JSON.stringify(d.data) !== JSON.stringify(dd.data);
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("image")
                        .filter(function(dd) {
                            return d.data.candidate !== dd.name;
                        })
                        .transition()
                        .style("opacity", 0.1);
                })
                .on("mouseout", function(d) {
                    inner.selectAll("g.arc_inner")
                        .transition()
                        .style("opacity", 1.0);

                    outer.selectAll("g.arc_outer")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("image")
                        .transition()
                        .style("opacity", 1.0);
                })
            .append("path")
                .attr("d", function(d) {
                    d.innerRadius = d.r - thickness;
                    d.outerRadius = d.r;

                    return arc_inner(d);
                })
                .style("fill", function(d, i) {
                    return d.data.toward === "supporting" ? "#2ca02c" : "d62728";
                })
                .each(function(d) {
                    this._current = d;
                });

        var image_clip = node_inner
            .append("defs")
            .append("clipPath")
                .attr("id", function(d) {
                    return "clip_" + d.name;
                })
            .append("circle")
                .attr({
                    "cx": 0,
                    "cy": 0,
                    "r": function(d) {
                        return d.r - thickness;
                    }
                });

        var image = node_inner
            .append("image")
                .attr({
                    "x": function(d) {
                        return thickness - d.r;
                    },
                    "y": function(d) {
                        return thickness - d.r;
                    },
                    "width": function(d) {
                        return 2 * (d.r - thickness);
                    },
                    "height": function(d) {
                        return 2 * (d.r - thickness);
                    },
                    "xlink:href": function(d) {
                        return "/images/" + d.name + "_head.jpg";
                    }
                })
                .style("clip-path", function(d) {
                    return "url(#clip_" + d.name + ")";
                })
                .on("mouseover", function(d, i) {
                    inner.selectAll("g.arc_inner")
                        .filter(function(dd) {
                            return d.name !== dd.data.candidate;
                        })
                        .transition()
                        .style("opacity", 0.1);

                    outer.selectAll("g.arc_outer")
                        .filter(function(dd) {
                            return d.name !== dd.data.candidate;
                        })
                        .transition()
                        .style("opacity", 0.1);

                    inner.selectAll("image")
                        .filter(function(dd) {
                            return d.name !== dd.name;
                        })
                        .transition()
                        .style("opacity", 0.1);
                })
                .on("mouseout", function(d) {
                    inner.selectAll("g.arc_inner")
                        .transition()
                        .style("opacity", 1.0);

                    outer.selectAll("g.arc_outer")
                        .transition()
                        .style("opacity", 1.0);

                    inner.selectAll("image")
                        .transition()
                        .style("opacity", 1.0);
                });

        d3.selectAll("#toward_controls input")
            .on("change", function() {
                var toward = this.value;

                pie_outer.value(function(d) {
                    return d.toward === toward || toward === "both" ? d.spent : 0;
                });

                path_outer = path_outer.data(pie_outer(data.outer));

                path_outer
                    .transition()
                        .duration(transition_duration)
                        .attrTween("d", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return arc_outer(interpolate(t));
                            };
                        });

                label_outer
                    .attr("visibility", "visible")
                    .transition()
                        .duration(transition_duration)
                        .style("opacity", function(d) {
                            return d.data.toward === toward || toward === "both" ? 1.0 : 0.0;
                        })
                        .each("end", function() {
                            d3.select(this).attr("visibility", function(d) {
                                return d.data.toward === toward || toward === "both" ? "visible" : "hidden";
                            });
                        });

                label_circle = label_circle.data(pie_outer(data.outer));

                label_circle
                    .transition()
                        .duration(transition_duration)
                        .attrTween("transform", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return "translate(" + arc_outer.centroid(interpolate(t)) + ")";
                            };
                        });

                label_line = label_line.data(pie_outer(data.outer));

                label_line
                    .transition()
                        .duration(transition_duration)
                        .attrTween("x1", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return arc_outer.centroid(interpolate(t))[0];
                            };
                        })
                        .attrTween("y1", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                return arc_outer.centroid(interpolate(t))[1];
                            };
                        })
                        .attrTween("x2", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t)),
                                    mid_angle = Math.atan2(c[1], c[0]);
                                return Math.cos(mid_angle) * radius_label;
                            };
                        })
                        .attrTween("y2", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t)),
                                    mid_angle = Math.atan2(c[1], c[0]);
                                return Math.sin(mid_angle) * radius_label;
                            };
                        });

                label_text_g = label_text_g.data(pie_outer(data.outer));

                label_text_g
                    .transition()
                        .duration(transition_duration)
                        .attrTween("transform", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t)),
                                    mid_angle = Math.atan2(c[1], c[0]),
                                    x = Math.cos(mid_angle) * radius_label,
                                    adjust = x > 0 ? 5 : -5,
                                    label_x = x + adjust,
                                    label_y = Math.sin(mid_angle) * radius_label;
                                return "translate(" + label_x + "," + label_y + ")";
                            };
                        });

                label_text = label_text.data(pie_outer(data.outer));

                function end_all(transition, callback) {
                    var n = 0;
                    transition
                        .each(function() { ++n; })
                        .each("end", function() {
                            if(!--n) callback.apply(this, arguments);
                        });
                }

                label_text
                    .transition()
                        .duration(transition_duration)
                        .attrTween("text-anchor", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);
                            return function(t) {
                                var c = arc_outer.centroid(interpolate(t)),
                                    mid_angle = Math.atan2(c[1], c[0]),
                                    x = Math.cos(mid_angle) * radius_label;
                                return x > 0 ? "start" : "end";
                            };
                        })
                        .call(end_all, label_relax);

                bubble_inner.value(function(d) {
                    return _(d.data).chain()
                        .filter(function(v) {
                            return v.toward === toward || toward === "both";
                        })
                        .pluck("spent")
                        .reduce(function(memo, num) {
                            return memo + num;
                        }, 0)
                        .value();
                });

                node_inner
                    .data(
                        bubble_inner.nodes({ children: data.inner })
                            .filter(function(d) {
                                return !d.children;
                            })
                    )
                    .transition()
                        .duration(transition_duration)
                        .attr("transform", function(d) {
                            return "translate(" + d.x + "," + d.y + ")"
                        });

                image_clip
                    .transition()
                        .duration(transition_duration)
                        .attr("r", function(d) {
                            return d.r - thickness;
                        });

                image
                    .transition()
                        .duration(transition_duration)
                        .attr({
                            "x": function(d) {
                                return thickness - d.r;
                            },
                            "y": function(d) {
                                return thickness - d.r;
                            },
                            "width": function(d) {
                                return 2 * (d.r - thickness);
                            },
                            "height": function(d) {
                                return 2 * (d.r - thickness);
                            }
                        });

                pie_inner.value(function(d) {
                    return d.toward === toward || toward === "both" ? d.spent : 0;
                });

                path_inner
                    .data(function(d) {
                        return pie_inner(d.data).map(function(m) {
                            m.r = d.r;
                            return m;
                        })
                    })
                    .transition()
                        .duration(transition_duration)
                        .attrTween("d", function(d) {
                            d.innerRadius = d.r - thickness;
                            d.outerRadius = d.r;
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(0);

                            return function(t) {
                                return arc_inner(interpolate(t));
                            };
                        });
            });
    });
});
