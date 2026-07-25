CREATE TABLE `fechamentoCaixa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` varchar(10) NOT NULL,
	`totalPedidos` int NOT NULL,
	`faturamentoTotal` int NOT NULL,
	`pedidosEntregues` int NOT NULL,
	`tempoMedioPreparo` int,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fechamentoCaixa_id` PRIMARY KEY(`id`)
);
