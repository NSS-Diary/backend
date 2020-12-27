-- phpMyAdmin SQL Dump
-- version 5.0.0
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Dec 27, 2020 at 09:22 AM
-- Server version: 10.3.26-MariaDB-1:10.3.26+maria~focal
-- PHP Version: 7.3.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nss-diary`
--

-- --------------------------------------------------------

--
-- Table structure for table `Activities`
--

CREATE TABLE `Activities` (
  `activity_id` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `classroom_code` varchar(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `type` enum('FARM','SOCIAL') NOT NULL,
  `Status` enum('LOCKED','UNLOCKED') NOT NULL DEFAULT 'UNLOCKED',
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `Classroom`
--

CREATE TABLE `Classroom` (
  `classroom_code` varchar(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(20) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `admin_name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `Enrolls`
--

CREATE TABLE `Enrolls` (
  `enrollment_id` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `activity_id` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `student` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `status` enum('ENROLLED','VERIFICATION','REJECTED','COMPLETED') NOT NULL DEFAULT 'ENROLLED',
  `hours` float NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `Notification`
--

CREATE TABLE `Notification` (
  `notification_id` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `classroom_code` varchar(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `Projects`
--

CREATE TABLE `Projects` (
  `name` varchar(50) NOT NULL,
  `status` enum('PROPOSED','COMPLETED','VERIFIED','REJECTED') NOT NULL DEFAULT 'PROPOSED'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `Proofs`
--

CREATE TABLE `Proofs` (
  `img_id` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `enrollment_id` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `img_path` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `Student_Metadata`
--

CREATE TABLE `Student_Metadata` (
  `student` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `farm_hours` float NOT NULL DEFAULT 0,
  `social_hours` float NOT NULL DEFAULT 0,
  `classroom_code` varchar(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `project_name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `username` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `email` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(200) NOT NULL,
  `user_type` enum('STUDENT','CLASSROOM_ADMIN','SUPER_ADMIN') NOT NULL DEFAULT 'STUDENT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `Users`
--

INSERT INTO `Users` (`username`, `email`, `name`, `password`, `user_type`) VALUES
('admin', 'admin@gmail.com', 'admin', '$argon2i$v=19$m=4096,t=3,p=1$ABn4uN8NzIQhl8gg3kqcjA$faxG2XW2eK555XMZ+XqsgUGQcmTgpxiQZvtoHApxszc', 'SUPER_ADMIN');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Activities`
--
ALTER TABLE `Activities`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `classroom_code` (`classroom_code`);

--
-- Indexes for table `Classroom`
--
ALTER TABLE `Classroom`
  ADD PRIMARY KEY (`classroom_code`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `admin_name` (`admin_name`);

--
-- Indexes for table `Enrolls`
--
ALTER TABLE `Enrolls`
  ADD PRIMARY KEY (`enrollment_id`),
  ADD UNIQUE KEY `activity_id_student` (`activity_id`,`student`) USING BTREE,
  ADD KEY `activity_id` (`activity_id`) USING BTREE,
  ADD KEY `student` (`student`);

--
-- Indexes for table `Notification`
--
ALTER TABLE `Notification`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `classroom_code` (`classroom_code`);

--
-- Indexes for table `Projects`
--
ALTER TABLE `Projects`
  ADD PRIMARY KEY (`name`);

--
-- Indexes for table `Proofs`
--
ALTER TABLE `Proofs`
  ADD PRIMARY KEY (`img_id`),
  ADD UNIQUE KEY `IMG_PATH` (`img_path`),
  ADD KEY `enrollment_foreign` (`enrollment_id`);

--
-- Indexes for table `Student_Metadata`
--
ALTER TABLE `Student_Metadata`
  ADD PRIMARY KEY (`student`),
  ADD KEY `classroom_code` (`classroom_code`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`username`),
  ADD UNIQUE KEY `EMAIL` (`email`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `Activities`
--
ALTER TABLE `Activities`
  ADD CONSTRAINT `classroom_code_foreign` FOREIGN KEY (`classroom_code`) REFERENCES `Classroom` (`classroom_code`);

--
-- Constraints for table `Classroom`
--
ALTER TABLE `Classroom`
  ADD CONSTRAINT `admin_foreign` FOREIGN KEY (`admin_name`) REFERENCES `Users` (`username`);

--
-- Constraints for table `Enrolls`
--
ALTER TABLE `Enrolls`
  ADD CONSTRAINT `activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `Activities` (`activity_id`),
  ADD CONSTRAINT `student_foreign` FOREIGN KEY (`student`) REFERENCES `Users` (`username`);

--
-- Constraints for table `Notification`
--
ALTER TABLE `Notification`
  ADD CONSTRAINT `classroom_code_foreign2` FOREIGN KEY (`classroom_code`) REFERENCES `Classroom` (`classroom_code`);

--
-- Constraints for table `Proofs`
--
ALTER TABLE `Proofs`
  ADD CONSTRAINT `enrollment_foreign` FOREIGN KEY (`enrollment_id`) REFERENCES `Enrolls` (`enrollment_id`);

--
-- Constraints for table `Student_Metadata`
--
ALTER TABLE `Student_Metadata`
  ADD CONSTRAINT `classroom_code_foreign3` FOREIGN KEY (`classroom_code`) REFERENCES `Classroom` (`classroom_code`),
  ADD CONSTRAINT `student_foreign2` FOREIGN KEY (`student`) REFERENCES `Users` (`username`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

