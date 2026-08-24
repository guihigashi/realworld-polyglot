ALTER TABLE follows
    ADD CONSTRAINT fk_follower_user FOREIGN KEY (follower_id) REFERENCES profiles (user_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_followed_user FOREIGN KEY (followed_id) REFERENCES profiles (user_id) ON DELETE CASCADE;
