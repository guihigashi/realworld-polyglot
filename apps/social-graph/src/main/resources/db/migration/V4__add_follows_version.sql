alter table profiles
    add column follows_version bigint not null default 1;