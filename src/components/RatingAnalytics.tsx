import React, { useState, useEffect } from 'react';
import { 
  Star, 
  TrendingUp, 
  Award, 
  Users, 
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ratingService from '@/api/ratingService';
import { RatingAnalytics as RatingAnalyticsType, RatingStats } from '@/types';

interface RatingAnalyticsProps {
  restaurantId: string;
  menuItemId?: string;
  className?: string;
  showTrends?: boolean;
  showTopItems?: boolean;
  showCategoryBreakdown?: boolean;
}

const RatingAnalytics: React.FC<RatingAnalyticsProps> = ({
  restaurantId,
  menuItemId,
  className,
  showTrends = true,
  showTopItems = true,
  showCategoryBreakdown = true
}) => {
  const [analytics, setAnalytics] = useState<RatingAnalyticsType | null>(null);
  const [menuItemStats, setMenuItemStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      
      // Fetch restaurant analytics
      const restaurantAnalytics = await ratingService.getRatingAnalytics(restaurantId);
      setAnalytics(restaurantAnalytics);

      // Fetch specific menu item stats if provided
      if (menuItemId) {
        try {
          const itemStats = await ratingService.getMenuItemRatingStats(menuItemId);
          setMenuItemStats(itemStats);
        } catch (itemError) {
          console.error('Error fetching menu item stats:', itemError);
          // Don't fail the whole component if menu item stats fail
        }
      }
    } catch (error: any) {
      console.error('Error fetching rating analytics:', error);
      setError(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  useEffect(() => {
    fetchAnalytics();
  }, [restaurantId, menuItemId]);

  // Chart colors
  const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Prepare rating distribution data for charts
  const getRatingDistributionData = (stats: RatingStats) => {
    return [
      { rating: '5 Stars', count: stats.ratingDistribution[5], percentage: (stats.ratingDistribution[5] / stats.totalReviews) * 100 },
      { rating: '4 Stars', count: stats.ratingDistribution[4], percentage: (stats.ratingDistribution[4] / stats.totalReviews) * 100 },
      { rating: '3 Stars', count: stats.ratingDistribution[3], percentage: (stats.ratingDistribution[3] / stats.totalReviews) * 100 },
      { rating: '2 Stars', count: stats.ratingDistribution[2], percentage: (stats.ratingDistribution[2] / stats.totalReviews) * 100 },
      { rating: '1 Star', count: stats.ratingDistribution[1], percentage: (stats.ratingDistribution[1] / stats.totalReviews) * 100 },
    ];
  };

  const renderSkeletonCard = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => renderSkeletonCard())}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderSkeletonCard()}
          {renderSkeletonCard()}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
        <Button variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Rating Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Insights and trends from customer reviews
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Rating */}
        {menuItemStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Item Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {menuItemStats.averageRating.toFixed(1)}
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-4 w-4",
                        star <= Math.round(menuItemStats.averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {menuItemStats.totalReviews} reviews
              </p>
            </CardContent>
          </Card>
        )}

        {/* Top Rated Items Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-500" />
              Top Rated Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {analytics.topRatedItems.filter(item => item.averageRating >= 4.5).length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Items with 4.5+ stars
            </p>
          </CardContent>
        </Card>

        {/* Total Reviews */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {analytics.topRatedItems.reduce((sum, item) => sum + item.totalReviews, 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Across all items
            </p>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Restaurant Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {analytics.topRatedItems.length > 0 
                ? (analytics.topRatedItems.reduce((sum, item) => sum + item.averageRating, 0) / analytics.topRatedItems.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Overall rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="distribution" className="space-y-6">
        <TabsList>
          <TabsTrigger value="distribution">Rating Distribution</TabsTrigger>
          {showTrends && <TabsTrigger value="trends">Trends</TabsTrigger>}
          {showTopItems && <TabsTrigger value="top-items">Top Items</TabsTrigger>}
          {showCategoryBreakdown && <TabsTrigger value="categories">Categories</TabsTrigger>}
        </TabsList>

        {/* Rating Distribution */}
        <TabsContent value="distribution" className="space-y-4">
          {menuItemStats && menuItemStats.totalReviews > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-4">Rating Breakdown</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={getRatingDistributionData(menuItemStats)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Visual Progress Bars */}
                  <div>
                    <h4 className="text-sm font-medium mb-4">Distribution</h4>
                    <div className="space-y-3">
                      {getRatingDistributionData(menuItemStats).map((item, index) => (
                        <div key={item.rating} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {item.rating}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {item.count} ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No rating data available</p>
            </Card>
          )}
        </TabsContent>

        {/* Trends */}
        {showTrends && (
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Rating Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.recentTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.recentTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis domain={[1, 5]} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any) => [value.toFixed(1), 'Average Rating']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageRating" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">Not enough data for trend analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Top Items */}
        {showTopItems && (
          <TabsContent value="top-items">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Rated Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topRatedItems.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topRatedItems.slice(0, 10).map((item, index) => (
                      <div 
                        key={item.menuItemId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {item.menuItemName}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.totalReviews} review{item.totalReviews !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-4 w-4",
                                  star <= Math.round(item.averageRating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {item.averageRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">No rated items found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Category Breakdown */}
        {showCategoryBreakdown && (
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.categoryRatings.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.categoryRatings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis domain={[1, 5]} />
                      <Tooltip />
                      <Bar dataKey="averageRating" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">No category data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default RatingAnalytics;