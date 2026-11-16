SELECT
    (
        SELECT group_concat(champion, ', ')
        FROM (
            SELECT json_extract(j.value, '$.character_id') AS champion
            FROM json_each(p.units_json) AS j
            ORDER BY champion
        )
    ) AS composition,
    COUNT(*) AS games,
    ROUND(AVG(p.placement), 2) AS avg_rank
FROM participants AS p
GROUP BY composition
ORDER BY games DESC
LIMIT 10;
