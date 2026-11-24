CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`price` integer NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);


CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer` text NOT NULL,
	`shop` text NOT NULL,
	`recipient` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`note` text NOT NULL,
	`subtotal` integer NOT NULL,
	`delivery` integer NOT NULL,
	`extra` integer NOT NULL,
	`total` integer NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`shop`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);


CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`shop` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`unit` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`shop`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);


CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`address` text NOT NULL,
	`phone` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`radius` integer NOT NULL,
	`delivery` integer NOT NULL,
	`extra` integer NOT NULL,
	`description` text NOT NULL,
	`created` text NOT NULL
);


CREATE TABLE cloud_users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password TEXT NOT NULL);
CREATE TABLE cloud_sessions (token TEXT PRIMARY KEY,user TEXT NOT NULL REFERENCES cloud_users(id),expires INTEGER NOT NULL);
CREATE INDEX cloud_sessions_expiry ON cloud_sessions(expires);
CREATE TABLE cloud_attempts (id TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
