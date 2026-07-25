ALTER TABLE `pedidos` MODIFY COLUMN `cliente` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `pedidos` MODIFY COLUMN `imagemUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `pedidos` ADD `dataFechamento` varchar(10);