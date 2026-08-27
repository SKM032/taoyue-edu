-- 课程简介字段类型升级：Text(64KB) -> MEDIUMTEXT(16MB)
-- 目的：支持 wangeditor 富文本编辑器产生的 HTML 内容
-- 执行方式：mysql -u<user> -p <database> < migrations/20260812_course_description_mediumtext.sql

ALTER TABLE courses MODIFY COLUMN description MEDIUMTEXT NULL COMMENT '课程简介（富文本 HTML）';
